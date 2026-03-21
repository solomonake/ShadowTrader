"""Pure rule evaluation engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID

from app.brokers.base import NormalizedTrade
from app.schemas.common import RuleType, RuleViolation


@dataclass
class EvaluatedRule:
    """Pure rule input."""

    id: UUID
    rule_type: RuleType
    severity: str
    params: dict
    enabled: bool = True


@dataclass
class SessionState:
    """Pure session state consumed by the rule engine."""

    trade_count_today: int = 0
    cumulative_pnl: Decimal = Decimal("0")
    consecutive_losses: int = 0
    last_trade_at: datetime | None = None
    last_loss_at: datetime | None = None
    last_trade_quantity: Decimal | None = None
    setup_tags_seen: set[str] = field(default_factory=set)
    recent_trades: list[NormalizedTrade] = field(default_factory=list)
    hourly_pattern_alerts_sent: set[str] = field(default_factory=set)


def evaluate_rules(
    rules: list[EvaluatedRule],
    session_state: SessionState,
    new_trade: NormalizedTrade,
) -> list[RuleViolation]:
    """Evaluate discipline rules for an incoming trade."""

    violations: list[RuleViolation] = []
    for rule in rules:
        if not rule.enabled:
            continue
        violation = _evaluate_rule(rule, session_state, new_trade)
        if violation is not None:
            violations.append(violation)
    return violations


def _evaluate_rule(
    rule: EvaluatedRule,
    session_state: SessionState,
    new_trade: NormalizedTrade,
) -> RuleViolation | None:
    now = new_trade.timestamp.astimezone(UTC)
    qty = Decimal(str(new_trade.quantity))
    pnl = Decimal(str(new_trade.pnl or 0))
    params = rule.params

    if rule.rule_type is RuleType.MAX_TRADES_PER_DAY:
        limit = int(params["max"])
        proposed_count = session_state.trade_count_today + 1
        if proposed_count > limit:
            return _violation(rule, now, new_trade, f"Trade #{proposed_count} exceeds your daily limit of {limit}.")

    if rule.rule_type is RuleType.MAX_LOSS_PER_DAY:
        max_loss = Decimal(str(params["max_loss"]))
        projected_loss = session_state.cumulative_pnl + pnl
        if projected_loss < 0 and abs(projected_loss) > max_loss:
            return _violation(
                rule,
                now,
                new_trade,
                f"Projected daily loss of {abs(projected_loss):.2f} exceeds your limit of {max_loss:.2f}.",
            )

    if rule.rule_type is RuleType.MIN_TIME_BETWEEN_TRADES and session_state.last_trade_at is not None:
        min_minutes = int(params["minutes"])
        elapsed = now - session_state.last_trade_at.astimezone(UTC)
        if elapsed < timedelta(minutes=min_minutes):
            actual_minutes = elapsed.total_seconds() / 60
            return _violation(
                rule,
                now,
                new_trade,
                f"Only {actual_minutes:.1f} minutes passed since your last trade; minimum is {min_minutes}.",
            )

    if rule.rule_type is RuleType.NO_TRADING_AFTER:
        cutoff = time.fromisoformat(params["time_utc"])
        if now.time() > cutoff:
            return _violation(
                rule,
                now,
                new_trade,
                f"Trade at {now.time().isoformat(timespec='minutes')} UTC is after your cutoff of {cutoff.isoformat(timespec='minutes')}.",
            )

    if rule.rule_type is RuleType.MAX_POSITION_SIZE:
        max_size = Decimal(str(params["max_quantity"]))
        if qty > max_size:
            return _violation(rule, now, new_trade, f"Size {qty} exceeds your max position size of {max_size}.")

    if rule.rule_type is RuleType.MAX_CONSECUTIVE_LOSSES:
        limit = int(params["max"])
        projected_losses = session_state.consecutive_losses + (1 if pnl < 0 else 0)
        if projected_losses > limit:
            return _violation(
                rule,
                now,
                new_trade,
                f"Loss streak would reach {projected_losses}, above your limit of {limit}.",
            )

    if rule.rule_type is RuleType.COOLDOWN_AFTER_LOSS and session_state.last_loss_at is not None:
        cooldown = int(params["minutes"])
        elapsed = now - session_state.last_loss_at.astimezone(UTC)
        if elapsed < timedelta(minutes=cooldown):
            actual_minutes = elapsed.total_seconds() / 60
            return _violation(
                rule,
                now,
                new_trade,
                f"Cooldown after loss is {cooldown} minutes; only {actual_minutes:.1f} minutes have passed.",
            )

    if rule.rule_type is RuleType.REQUIRED_SETUP_TAG:
        required_tag = str(params["tag"])
        trade_tag = str(new_trade.metadata.get("setup_tag", ""))
        if trade_tag != required_tag:
            return _violation(
                rule,
                now,
                new_trade,
                f"Trade setup tag '{trade_tag or 'missing'}' does not match required tag '{required_tag}'.",
            )

    return None


def _violation(
    rule: EvaluatedRule,
    timestamp: datetime,
    trade: NormalizedTrade,
    message: str,
) -> RuleViolation:
    return RuleViolation(
        rule_id=str(rule.id),
        rule_type=rule.rule_type,
        severity=rule.severity,
        message=message,
        timestamp=timestamp,
        trade_id=trade.broker_trade_id,
    )
