"""Billing feature-gating dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.database import get_db_session
from app.billing.stripe_service import StripeService

STARTER_FEATURES = {"rules", "trades", "sessions", "alerts", "broker", "patterns_basic"}
PRO_FEATURES = STARTER_FEATURES | {"chat", "patterns_full", "daily_summary", "unlimited_brokers"}


async def check_subscription(user_id, feature: str, session: AsyncSession) -> bool:
    """Return whether a user can access a feature."""

    service = StripeService(session)
    status_info = await service.get_subscription_status(user_id)
    features = set(status_info.features)
    return feature in features


def require_feature(feature: str):
    """Return a dependency that enforces subscription access."""

    async def _dependency(
        user_id=Depends(get_current_user_id),
        session: AsyncSession = Depends(get_db_session),
    ):
        allowed = await check_subscription(user_id, feature, session)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Your current plan does not include the '{feature}' feature.",
            )
        return user_id

    return _dependency
