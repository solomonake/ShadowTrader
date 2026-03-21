"""Rule engine tests."""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from app.schemas.common import RuleType
from app.services.rule_engine import EvaluatedRule, SessionState, evaluate_rules


def test_max_trades_per_day_violation(sample_trade) -> None:
    """The engine should flag a trade count violation."""

    state = SessionState(trade_count_today=0)
    rule = EvaluatedRule(id=uuid.uuid4(), rule_type=RuleType.MAX_TRADES_PER_DAY, severity="warn", params={"max": 0})
    violations = evaluate_rules([rule], state, sample_trade)
    assert len(violations) == 1
    assert "daily limit of 0" in violations[0].message


def test_min_time_between_trades_violation(sample_trade) -> None:
    """The engine should enforce minimum spacing."""

    state = SessionState(last_trade_at=sample_trade.timestamp - timedelta(minutes=2))
    rule = EvaluatedRule(
        id=uuid.uuid4(),
        rule_type=RuleType.MIN_TIME_BETWEEN_TRADES,
        severity="warn",
        params={"minutes": 5},
    )
    violations = evaluate_rules([rule], state, sample_trade)
    assert len(violations) == 1
    assert "minimum is 5" in violations[0].message


def test_required_setup_tag_violation(sample_trade) -> None:
    """The engine should require a matching setup tag."""

    state = SessionState()
    rule = EvaluatedRule(
        id=uuid.uuid4(),
        rule_type=RuleType.REQUIRED_SETUP_TAG,
        severity="block",
        params={"tag": "pullback"},
    )
    violations = evaluate_rules([rule], state, sample_trade)
    assert len(violations) == 1
    assert "pullback" in violations[0].message


def test_max_loss_per_day_violation() -> None:
    """The engine should enforce daily loss limits."""

    from app.brokers.base import NormalizedTrade, Side

    trade = NormalizedTrade(
        broker="alpaca",
        broker_trade_id="trade-2",
        symbol="TSLA",
        side=Side.SELL,
        quantity=2,
        price=180,
        timestamp=datetime(2026, 3, 19, 15, 0, tzinfo=UTC),
        pnl=-75,
    )
    state = SessionState(cumulative_pnl=Decimal("-40"))
    rule = EvaluatedRule(
        id=uuid.uuid4(),
        rule_type=RuleType.MAX_LOSS_PER_DAY,
        severity="block",
        params={"max_loss": 100},
    )
    violations = evaluate_rules([rule], state, trade)
    assert len(violations) == 1
    assert "115.00" in violations[0].message
