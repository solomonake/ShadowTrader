"""Behavioral pattern detector."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.brokers.base import NormalizedTrade
from app.models.baseline import UserBaseline
from app.schemas.pattern import PatternAlert
from app.services.rule_engine import SessionState


class PatternDetector:
    """Analyze trades against a stored user baseline."""

    def __init__(self, baseline: UserBaseline | None) -> None:
        """Initialize the detector with an optional baseline."""

        self.baseline = baseline
        self.enabled = baseline is not None and baseline.trade_count >= 30

    @classmethod
    async def from_storage(cls, db_factory, user_id: uuid.UUID) -> "PatternDetector":
        """Load the user's baseline from storage."""

        async with db_factory() as session:
            baseline = await session.scalar(select(UserBaseline).where(UserBaseline.user_id == user_id))
        return cls(baseline)

    def analyze(self, new_trade: NormalizedTrade, session_state: SessionState) -> list[PatternAlert]:
        """Analyze a new trade for behavioral patterns."""

        if not self.enabled or self.baseline is None:
            return []

        alerts: list[PatternAlert] = []
        current_hour = new_trade.timestamp.astimezone(UTC).strftime("%H")
        current_hour_count = len(
            [
                trade
                for trade in session_state.recent_trades
                if trade.timestamp >= new_trade.timestamp - timedelta(minutes=60)
            ]
        )
        last_trade = session_state.recent_trades[-2] if len(session_state.recent_trades) >= 2 else None

        for candidate in (
            self.detect_frequency_spike(current_hour_count, current_hour, new_trade),
            self.detect_revenge_trading(new_trade, last_trade),
            self.detect_streak_degradation(session_state.consecutive_losses, new_trade),
            self.detect_time_vulnerability(current_hour, session_state, new_trade),
            self.detect_size_escalation(session_state.recent_trades, new_trade),
        ):
            if candidate is not None:
                alerts.append(candidate)
        return alerts

    def detect_frequency_spike(
        self,
        current_hour_count: int,
        hour: str,
        trade: NormalizedTrade,
    ) -> PatternAlert | None:
        """Detect a trade frequency spike."""

        assert self.baseline is not None
        mean = float(self.baseline.metrics.get("avg_trades_per_hour", {}).get(hour, 0))
        std = float(self.baseline.metrics.get("std_trades_per_hour", {}).get(hour, 0))
        if std <= 0:
            return None
        z_score = (current_hour_count - mean) / std
        if z_score <= 2:
            return None
        return PatternAlert(
            severity="warn",
            pattern_type="frequency_spike",
            message=(
                f"You've made {current_hour_count} trades in the last hour. "
                f"Your average is {mean:.1f} +/- {std:.1f}. Consider slowing down."
            ),
            timestamp=trade.timestamp,
            confidence=min(round(z_score / 4, 2), 1.0),
        )

    def detect_revenge_trading(
        self,
        new_trade: NormalizedTrade,
        last_trade: NormalizedTrade | None,
    ) -> PatternAlert | None:
        """Detect revenge trading after a loss."""

        assert self.baseline is not None
        if last_trade is None or last_trade.pnl is None or last_trade.pnl >= 0:
            return None
        minutes_since = (new_trade.timestamp - last_trade.timestamp).total_seconds() / 60
        if minutes_since > 10:
            return None
        trade_value = new_trade.quantity * new_trade.price
        avg_size = float(self.baseline.metrics.get("avg_position_size", 0))
        if avg_size <= 0 or trade_value <= avg_size:
            return None
        pct_above = ((trade_value - avg_size) / avg_size) * 100
        return PatternAlert(
            severity="block",
            pattern_type="revenge_trading",
            message=(
                f"This trade is {pct_above:.0f}% larger than your average and comes "
                f"{minutes_since:.0f} minutes after a loss. This matches a revenge trading pattern."
            ),
            timestamp=new_trade.timestamp,
            confidence=min(round(0.7 + (pct_above / 200), 2), 1.0),
        )

    def detect_streak_degradation(
        self,
        consecutive_losses: int,
        trade: NormalizedTrade,
    ) -> PatternAlert | None:
        """Detect historically degraded performance during a loss streak."""

        assert self.baseline is not None
        if consecutive_losses < 2:
            return None
        overall_wr = float(self.baseline.metrics.get("overall_win_rate", 0.5))
        streak_key = str(min(consecutive_losses, 4))
        streak_wr = self.baseline.metrics.get("win_rate_after_consecutive_losses", {}).get(streak_key)
        if streak_wr is None:
            return None
        streak_wr_float = float(streak_wr)
        if streak_wr_float >= overall_wr - 0.15:
            return None
        return PatternAlert(
            severity="warn",
            pattern_type="streak_degradation",
            message=(
                f"{consecutive_losses} losses in a row. Your historical win rate after "
                f"{consecutive_losses} consecutive losses is {streak_wr_float:.0%} vs. your overall {overall_wr:.0%}. "
                f"Consider stepping away."
            ),
            timestamp=trade.timestamp,
            confidence=0.8,
        )

    def detect_time_vulnerability(
        self,
        current_hour: str,
        session_state: SessionState,
        trade: NormalizedTrade,
    ) -> PatternAlert | None:
        """Detect a historically weak hour."""

        assert self.baseline is not None
        alert_key = trade.timestamp.astimezone(UTC).strftime("%Y-%m-%d-%H")
        if alert_key in session_state.hourly_pattern_alerts_sent:
            return None
        overall_wr = float(self.baseline.metrics.get("overall_win_rate", 0.5))
        hour_wr = self.baseline.metrics.get("win_rate_by_hour", {}).get(current_hour)
        if hour_wr is None:
            return None
        hour_wr_float = float(hour_wr)
        if hour_wr_float >= overall_wr - 0.20:
            return None
        session_state.hourly_pattern_alerts_sent.add(alert_key)
        return PatternAlert(
            severity="warn",
            pattern_type="time_vulnerability",
            message=(
                f"Your win rate between {current_hour}:00-{current_hour}:59 is "
                f"{hour_wr_float:.0%} vs. your overall {overall_wr:.0%}. "
                f"This is historically your weakest hour."
            ),
            timestamp=trade.timestamp,
            confidence=0.75,
        )

    def detect_size_escalation(
        self,
        recent_trades: list[NormalizedTrade],
        trade: NormalizedTrade,
    ) -> PatternAlert | None:
        """Detect escalating position sizes after a loss."""

        if len(recent_trades) < 3:
            return None
        last_three = recent_trades[-3:]
        sizes = [item.quantity * item.price for item in last_three]
        if not (sizes[0] < sizes[1] < sizes[2]):
            return None
        if len(recent_trades) >= 4:
            preceding_trade = recent_trades[-4]
            if preceding_trade.pnl is not None and preceding_trade.pnl >= 0:
                return None
        return PatternAlert(
            severity="block",
            pattern_type="size_escalation",
            message=(
                f"Position sizes increasing: ${sizes[0]:,.0f} -> ${sizes[1]:,.0f} -> ${sizes[2]:,.0f}. "
                f"This pattern historically precedes your largest losses."
            ),
            timestamp=trade.timestamp,
            confidence=0.85,
        )
