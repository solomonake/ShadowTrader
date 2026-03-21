"""Alert schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AlertEvent(BaseModel):
    """WebSocket alert payload."""

    type: str
    severity: str
    rule_type: str | None = None
    pattern_type: str | None = None
    message: str
    timestamp: datetime
    trade_id: UUID | None = None
    confidence: float | None = None


class RuleViolationRead(BaseModel):
    """Persisted rule violation response."""

    id: UUID
    user_id: UUID
    rule_id: UUID | None = None
    trade_id: UUID | None = None
    message: str
    severity: str
    acknowledged: bool
    timestamp: datetime

    model_config = {"from_attributes": True}
