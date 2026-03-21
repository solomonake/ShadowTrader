"""Common schema types."""

from datetime import UTC, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class RuleType(str, Enum):
    """All supported discipline rule types."""

    MAX_TRADES_PER_DAY = "max_trades_per_day"
    MAX_LOSS_PER_DAY = "max_loss_per_day"
    MIN_TIME_BETWEEN_TRADES = "min_time_between_trades"
    NO_TRADING_AFTER = "no_trading_after"
    MAX_POSITION_SIZE = "max_position_size"
    MAX_CONSECUTIVE_LOSSES = "max_consecutive_losses"
    COOLDOWN_AFTER_LOSS = "cooldown_after_loss"
    REQUIRED_SETUP_TAG = "required_setup_tag"


class Severity(str, Enum):
    """Supported alert severities."""

    WARN = "warn"
    BLOCK = "block"
    LOG = "log"


class RuleViolation(BaseModel):
    """Rule engine output."""

    rule_id: str
    rule_type: RuleType
    severity: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    trade_id: str | None = None


class APIMessage(BaseModel):
    """Simple API response message."""

    message: str
    id: UUID | None = None
