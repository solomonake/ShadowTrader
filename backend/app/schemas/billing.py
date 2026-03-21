"""Billing schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SubscriptionRead(BaseModel):
    """Subscription response schema."""

    user_id: UUID
    tier: str
    status: str
    current_period_end: datetime | None = None
    is_trial: bool = False
    features: list[str] = Field(default_factory=list)


class CheckoutRequest(BaseModel):
    """Stripe checkout request."""

    tier: str
    interval: str = "monthly"


class CheckoutResponse(BaseModel):
    """Stripe checkout response."""

    checkout_url: str


class PortalResponse(BaseModel):
    """Stripe portal response."""

    portal_url: str
