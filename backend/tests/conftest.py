"""Pytest fixtures."""

from datetime import UTC, datetime

import pytest

from app.brokers.base import NormalizedTrade, Side
from app.services.rule_engine import EvaluatedRule
from app.ws.alert_hub import AlertHub


class DummyBroker:
    """Broker adapter test double."""

    def __init__(self, trades: list[NormalizedTrade]) -> None:
        """Initialize the dummy broker."""

        self._trades = trades

    async def connect(self, credentials: dict) -> bool:
        """No-op connect."""

        return True

    async def disconnect(self) -> None:
        """No-op disconnect."""

    async def get_recent_trades(self, since: datetime) -> list[NormalizedTrade]:
        """Return trades after a timestamp."""

        return [trade for trade in self._trades if trade.timestamp >= since]

    async def get_account(self):
        """Return a fake account."""

        return None

    async def is_connected(self) -> bool:
        """Always connected."""

        return True


class RecordingAlertHub(AlertHub):
    """Alert hub that records broadcasts."""

    def __init__(self) -> None:
        """Initialize recording storage."""

        super().__init__()
        self.payloads: list[dict] = []

    async def broadcast(self, payload: dict) -> None:
        """Record the payload instead of sending it."""

        self.payloads.append(payload)


@pytest.fixture
def sample_trade() -> NormalizedTrade:
    """Return a representative normalized trade."""

    return NormalizedTrade(
        broker="alpaca",
        broker_trade_id="trade-1",
        symbol="AAPL",
        side=Side.BUY,
        quantity=10,
        price=200,
        timestamp=datetime(2026, 3, 19, 14, 30, tzinfo=UTC),
        pnl=-50,
        metadata={"setup_tag": "breakout"},
    )


@pytest.fixture
def sample_rule() -> EvaluatedRule:
    """Return a representative rule."""

    import uuid
    from app.schemas.common import RuleType

    return EvaluatedRule(
        id=uuid.uuid4(),
        rule_type=RuleType.MAX_TRADES_PER_DAY,
        severity="warn",
        params={"max": 0},
    )
