"""Session tracker tests."""

from datetime import UTC, datetime

import pytest

from app.services.session_tracker import SessionTracker


@pytest.mark.asyncio
async def test_session_tracker_processes_trade(sample_trade, sample_rule) -> None:
    """The tracker should broadcast alerts and update metrics."""

    class Broker:
        async def get_recent_trades(self, since: datetime):
            return [sample_trade]

    class RecordingAlertHub:
        def __init__(self) -> None:
            self.payloads: list[dict] = []

        async def broadcast(self, payload: dict) -> None:
            self.payloads.append(payload)

    alert_hub = RecordingAlertHub()
    tracker = SessionTracker(Broker(), alert_hub)
    alerts = await tracker.poll_once([sample_rule], datetime(2026, 3, 19, 0, 0, tzinfo=UTC))
    assert len(alerts) == 1
    assert tracker.metrics.trade_count == 1
    assert alert_hub.payloads[0]["rule_type"] == "max_trades_per_day"
