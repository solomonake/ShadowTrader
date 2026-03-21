"""Trade schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TradeBase(BaseModel):
    """Shared trade fields."""

    broker: str
    broker_trade_id: str
    symbol: str
    side: str
    quantity: Decimal
    price: Decimal
    pnl: Decimal | None = None
    timestamp: datetime
    session_id: UUID | None = None
    metadata: dict = Field(default_factory=dict)


class TradeCreate(TradeBase):
    """Trade creation schema."""

    user_id: UUID


class TradeRead(TradeBase):
    """Trade response schema."""

    id: UUID
    user_id: UUID

    model_config = {"from_attributes": True}
