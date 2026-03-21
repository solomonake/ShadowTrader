"""Rule schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import RuleType, Severity


class RuleBase(BaseModel):
    """Shared rule fields."""

    rule_type: RuleType
    severity: Severity = Severity.WARN
    params: dict = Field(default_factory=dict)
    enabled: bool = True


class RuleCreate(RuleBase):
    """Rule creation schema."""

    user_id: UUID


class RuleUpdate(BaseModel):
    """Rule partial update schema."""

    severity: Severity | None = None
    params: dict | None = None
    enabled: bool | None = None


class RuleRead(RuleBase):
    """Rule response schema."""

    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
