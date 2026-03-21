"""Stripe billing helpers."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import SubscriptionRead


class StripeService:
    """Wrapper around Stripe billing operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.settings = get_settings()

    async def get_subscription(self, user_id: UUID) -> Subscription | None:
        """Return the subscription row for a user."""

        return await self.session.scalar(select(Subscription).where(Subscription.user_id == user_id))

    async def get_subscription_status(self, user_id: UUID) -> SubscriptionRead:
        """Return the effective subscription status including trial state."""

        subscription = await self.get_subscription(user_id)
        if subscription is None:
            user = await self.session.get(User, user_id)
            days_since_signup = 0
            if user is not None and user.created_at is not None:
                days_since_signup = (datetime.now(UTC) - user.created_at.astimezone(UTC)).days
            return SubscriptionRead(
                user_id=user_id,
                tier="trial",
                status="active",
                current_period_end=None,
                is_trial=days_since_signup <= 14,
                features=[
                    "rules",
                    "trades",
                    "sessions",
                    "alerts",
                    "broker",
                    "chat",
                    "daily_summary",
                    "patterns_full",
                ],
            )

        features = (
            ["rules", "trades", "sessions", "alerts", "broker", "patterns_basic"]
            if subscription.tier == "starter"
            else ["rules", "trades", "sessions", "alerts", "broker", "patterns_basic", "chat", "daily_summary", "patterns_full", "unlimited_brokers"]
        )
        return SubscriptionRead(
            user_id=user_id,
            tier=subscription.tier,
            status=subscription.status,
            current_period_end=subscription.current_period_end,
            is_trial=subscription.tier == "trial",
            features=features,
        )

    async def create_checkout_session(self, user_id: UUID, tier: str, interval: str) -> str:
        """Create a Stripe checkout session."""

        if not self.settings.stripe_secret_key:
            raise RuntimeError("Stripe is not configured. Add STRIPE_SECRET_KEY to .env")
        import stripe

        stripe.api_key = self.settings.stripe_secret_key
        price_map = {
            ("starter", "monthly"): self.settings.stripe_price_starter_monthly,
            ("starter", "yearly"): self.settings.stripe_price_starter_yearly,
            ("pro", "monthly"): self.settings.stripe_price_pro_monthly,
            ("pro", "yearly"): self.settings.stripe_price_pro_yearly,
        }
        price_id = price_map.get((tier, interval))
        if not price_id:
            raise RuntimeError("Stripe price is not configured for that plan.")

        checkout = stripe.checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{self.settings.frontend_url}/billing?checkout=success",
            cancel_url=f"{self.settings.frontend_url}/billing?checkout=cancelled",
            client_reference_id=str(user_id),
            metadata={"user_id": str(user_id), "tier": tier},
        )
        return checkout.url

    async def create_portal_session(self, user_id: UUID) -> str:
        """Create a Stripe billing portal session."""

        subscription = await self.get_subscription(user_id)
        if subscription is None or not subscription.stripe_customer_id:
            raise RuntimeError("No Stripe customer found for this user.")
        if not self.settings.stripe_secret_key:
            raise RuntimeError("Stripe is not configured. Add STRIPE_SECRET_KEY to .env")
        import stripe

        stripe.api_key = self.settings.stripe_secret_key
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{self.settings.frontend_url}/billing",
        )
        return session.url

    async def handle_webhook(self, payload: bytes, signature: str | None) -> dict[str, Any]:
        """Handle a Stripe webhook event."""

        if not self.settings.stripe_secret_key or not self.settings.stripe_webhook_secret:
            raise RuntimeError("Stripe webhook is not configured.")
        import stripe

        stripe.api_key = self.settings.stripe_secret_key
        event = stripe.Webhook.construct_event(payload, signature, self.settings.stripe_webhook_secret)
        event_type = event["type"]
        data = event["data"]["object"]
        if event_type == "checkout.session.completed":
            await self._upsert_subscription(
                user_id=UUID(data["client_reference_id"]),
                stripe_customer_id=data.get("customer"),
                stripe_subscription_id=data.get("subscription"),
                tier=data.get("metadata", {}).get("tier", "starter"),
                status="active",
            )
        elif event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
            user_id = await self._user_id_from_customer(data.get("customer"))
            if user_id is not None:
                await self._upsert_subscription(
                    user_id=user_id,
                    stripe_customer_id=data.get("customer"),
                    stripe_subscription_id=data.get("id"),
                    tier=self._infer_tier(data),
                    status=data.get("status", "active"),
                    current_period_end=datetime.fromtimestamp(data.get("current_period_end", 0), tz=UTC)
                    if data.get("current_period_end")
                    else None,
                )
        elif event_type == "invoice.payment_failed":
            user_id = await self._user_id_from_customer(data.get("customer"))
            if user_id is not None:
                subscription = await self.get_subscription(user_id)
                if subscription is not None:
                    subscription.status = "past_due"
                    await self.session.commit()
        return {"received": True, "type": event_type}

    async def _user_id_from_customer(self, stripe_customer_id: str | None) -> UUID | None:
        if not stripe_customer_id:
            return None
        subscription = await self.session.scalar(
            select(Subscription).where(Subscription.stripe_customer_id == stripe_customer_id)
        )
        return subscription.user_id if subscription else None

    async def _upsert_subscription(
        self,
        user_id: UUID,
        stripe_customer_id: str | None,
        stripe_subscription_id: str | None,
        tier: str,
        status: str,
        current_period_end: datetime | None = None,
    ) -> None:
        subscription = await self.get_subscription(user_id)
        if subscription is None:
            subscription = Subscription(
                user_id=user_id,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
                tier=tier,
                status=status,
                current_period_end=current_period_end,
            )
            self.session.add(subscription)
        else:
            subscription.stripe_customer_id = stripe_customer_id
            subscription.stripe_subscription_id = stripe_subscription_id
            subscription.tier = tier
            subscription.status = status
            subscription.current_period_end = current_period_end
        await self.session.commit()

    @staticmethod
    def _infer_tier(subscription_payload: dict[str, Any]) -> str:
        metadata = subscription_payload.get("metadata") or {}
        return metadata.get("tier", "starter")
