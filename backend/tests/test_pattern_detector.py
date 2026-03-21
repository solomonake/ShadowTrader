"""Pattern detector tests."""

import uuid
from datetime import UTC, datetime, timedelta

from app.brokers.base import NormalizedTrade, Side
from app.models.baseline import UserBaseline
from app.services.pattern_detector import PatternDetector
from app.services.rule_engine import SessionState


def test_detect_revenge_trading_pattern() -> None:
    """A large quick trade after a loss should trigger revenge trading."""

    baseline = UserBaseline(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        trade_count=80,
        window_days=90,
        metrics={
            "avg_position_size": 5000,
            "avg_trades_per_hour": {"14": 1.0},
            "std_trades_per_hour": {"14": 0.5},
            "overall_win_rate": 0.5,
            "win_rate_after_consecutive_losses": {"2": 0.2},
            "win_rate_by_hour": {"14": 0.3},
        },
    )
    detector = PatternDetector(baseline)
    loss_trade = NormalizedTrade(
        broker="alpaca",
        broker_trade_id="loss-1",
        symbol="AAPL",
        side=Side.BUY,
        quantity=20,
        price=100,
        timestamp=datetime(2026, 3, 21, 14, 0, tzinfo=UTC),
        pnl=-150,
    )
    new_trade = NormalizedTrade(
        broker="alpaca",
        broker_trade_id="loss-2",
        symbol="AAPL",
        side=Side.BUY,
        quantity=100,
        price=120,
        timestamp=loss_trade.timestamp + timedelta(minutes=5),
        pnl=-25,
    )
    state = SessionState(recent_trades=[loss_trade, new_trade], consecutive_losses=2)

    alerts = detector.analyze(new_trade, state)

    assert any(alert.pattern_type == "revenge_trading" for alert in alerts)
