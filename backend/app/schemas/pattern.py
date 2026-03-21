"""Pattern schemas."""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PatternAlert(BaseModel):
    """Pattern detector output."""

    type: str = "pattern_alert"
    severity: str
    pattern_type: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    trade_id: UUID | None = None
    confidence: float


class PatternAlertRead(BaseModel):
    """Persisted pattern alert response."""

    id: UUID
    user_id: UUID
    trade_id: UUID | None = None
    pattern_type: str
    severity: str
    message: str
    confidence: float
    timestamp: datetime

    model_config = {"from_attributes": True}
