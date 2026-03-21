"""Session schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TradingSessionRead(BaseModel):
    """Trading session response schema."""

    id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: datetime | None = None
    trade_count: int
    rules_followed: int
    rules_broken: int
    total_pnl: Decimal
    discipline_score: Decimal | None = None
    summary: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionSummaryResponse(BaseModel):
    """Daily summary response."""

    session_id: UUID
    summary: str
