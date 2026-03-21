"""Session tracking and broker polling."""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.brokers.base import BrokerAdapter, NormalizedTrade
from app.models.pattern_alert import PatternAlertRecord
from app.models.session import TradingSession
from app.models.trade import Trade
from app.models.violation import RuleViolationRecord
from app.schemas.alert import AlertEvent
from app.schemas.pattern import PatternAlert
from app.schemas.common import RuleViolation
from app.services.pattern_detector import PatternDetector
from app.services.rule_engine import EvaluatedRule, SessionState, evaluate_rules
from app.services.scoring import calculate_discipline_score
from app.ws.alert_hub import AlertHub

logger = logging.getLogger(__name__)


@dataclass
class SessionMetrics:
    """In-memory session metrics."""

    session_id: str
    started_at: datetime
    trade_count: int = 0
    rules_followed: int = 0
    rules_broken: int = 0
    total_pnl: Decimal = Decimal("0")
    last_trade_at: datetime | None = None
    consecutive_losses: int = 0
    last_loss_at: datetime | None = None

    @property
    def discipline_score(self) -> Decimal:
        """Return the current discipline score."""

        total_checks = self.rules_followed + self.rules_broken
        return calculate_discipline_score(self.rules_followed, total_checks)


class SessionTracker:
    """Poll a broker adapter and evaluate rules against new trades."""

    def __init__(
        self,
        broker: BrokerAdapter,
        alert_hub: AlertHub,
        poll_interval_seconds: float = 5.0,
        user_id: uuid.UUID | None = None,
        db_factory: Callable[[], Any] | None = None,
    ) -> None:
        """Initialize the tracker."""

        self.broker = broker
        self.alert_hub = alert_hub
        self.poll_interval_seconds = poll_interval_seconds
        self._user_id = user_id
        self._db_factory = db_factory
        self.state = SessionState()
        self.metrics = SessionMetrics(session_id=str(uuid.uuid4()), started_at=datetime.now(UTC))
        self._seen_trade_ids: set[str] = set()
        self._running = False

    async def poll_once(self, rules: list[EvaluatedRule], since: datetime) -> list[AlertEvent]:
        """Poll once and return emitted alert events."""

        trades = await self.broker.get_recent_trades(since)
        alerts: list[AlertEvent] = []
        for trade in sorted(trades, key=lambda item: item.timestamp):
            if trade.broker_trade_id in self._seen_trade_ids:
                continue
            self._seen_trade_ids.add(trade.broker_trade_id)
            trade_alerts = await self.process_trade(rules, trade)
            alerts.extend(trade_alerts)
        return alerts

    async def process_trade(self, rules: list[EvaluatedRule], trade: NormalizedTrade) -> list[AlertEvent]:
        """Evaluate one trade, update session state, and publish alerts."""

        violations = evaluate_rules(rules, self.state, trade)
        total_checks = len(rules)
        self.metrics.trade_count += 1
        self.metrics.total_pnl += Decimal(str(trade.pnl or 0))
        self.metrics.last_trade_at = trade.timestamp

        if total_checks > 0:
            self.metrics.rules_broken += len(violations)
            self.metrics.rules_followed += max(total_checks - len(violations), 0)

        trade_pnl = Decimal(str(trade.pnl or 0))
        if trade_pnl < 0:
            self.metrics.consecutive_losses += 1
            self.metrics.last_loss_at = trade.timestamp
        else:
            self.metrics.consecutive_losses = 0

        self.state.trade_count_today = self.metrics.trade_count
        self.state.cumulative_pnl = self.metrics.total_pnl
        self.state.consecutive_losses = self.metrics.consecutive_losses
        self.state.last_trade_at = trade.timestamp
        self.state.last_loss_at = self.metrics.last_loss_at
        self.state.last_trade_quantity = Decimal(str(trade.quantity))
        setup_tag = trade.metadata.get("setup_tag")
        if setup_tag:
            self.state.setup_tags_seen.add(str(setup_tag))
        self.state.recent_trades.append(trade)
        self.state.recent_trades = self.state.recent_trades[-20:]

        pattern_alerts: list[PatternAlert] = []
        if self._db_factory is not None and self._user_id is not None:
            detector = await PatternDetector.from_storage(self._db_factory, self._user_id)
            pattern_alerts = detector.analyze(trade, self.state)

        # Persist trade and violations to DB, get back the trade DB UUID
        trade_db_id = await self._persist_trade_and_violations(trade, violations, pattern_alerts)

        alerts: list[AlertEvent] = []
        for violation in violations:
            alert = AlertEvent(
                type="rule_violation",
                severity=violation.severity,
                rule_type=violation.rule_type.value,
                message=violation.message,
                timestamp=violation.timestamp,
                trade_id=trade_db_id,
            )
            alerts.append(alert)
            await self.alert_hub.broadcast(alert.model_dump(mode="json"))
        for pattern_alert in pattern_alerts:
            alert = AlertEvent(
                type="pattern_alert",
                severity=pattern_alert.severity,
                pattern_type=pattern_alert.pattern_type,
                message=pattern_alert.message,
                timestamp=pattern_alert.timestamp,
                trade_id=trade_db_id,
                confidence=pattern_alert.confidence,
            )
            alerts.append(alert)
            await self.alert_hub.broadcast(alert.model_dump(mode="json"))
        return alerts

    async def _persist_trade_and_violations(
        self,
        trade: NormalizedTrade,
        violations: list[RuleViolation],
        pattern_alerts: list[PatternAlert],
    ) -> uuid.UUID | None:
        """Persist the trade and any violations to the database."""

        if self._db_factory is None or self._user_id is None:
            return None

        try:
            async with self._db_factory() as session:
                trade_db_id = await self._upsert_trade(session, trade)
                for v in violations:
                    await self._insert_violation(session, v, trade_db_id)
                for pattern_alert in pattern_alerts:
                    await self._insert_pattern_alert(session, pattern_alert, trade_db_id)
                await self._upsert_session_metrics(session, trade_db_id, trade.timestamp)
                await self._maybe_compute_baseline(session)
                await session.commit()
                return trade_db_id
        except Exception as exc:
            logger.warning("DB persist failed for trade %s: %s", trade.broker_trade_id, exc)
            return None

    async def _upsert_trade(self, session: AsyncSession, trade: NormalizedTrade) -> uuid.UUID:
        """Insert the trade if it doesn't exist, return its DB UUID."""

        result = await session.execute(
            select(Trade).where(
                Trade.user_id == self._user_id,
                Trade.broker == trade.broker,
                Trade.broker_trade_id == trade.broker_trade_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            return existing.id

        record = Trade(
            user_id=self._user_id,
            broker=trade.broker,
            broker_trade_id=trade.broker_trade_id,
            symbol=trade.symbol,
            side=trade.side.value,
            quantity=Decimal(str(trade.quantity)),
            price=Decimal(str(trade.price)),
            pnl=Decimal(str(trade.pnl)) if trade.pnl is not None else None,
            timestamp=trade.timestamp,
            metadata_json=trade.metadata,
        )
        session.add(record)
        await session.flush()
        return record.id

    async def _insert_violation(
        self,
        session: AsyncSession,
        violation: RuleViolation,
        trade_db_id: uuid.UUID | None,
    ) -> None:
        """Insert a rule violation record."""

        record = RuleViolationRecord(
            user_id=self._user_id,
            rule_id=uuid.UUID(violation.rule_id) if violation.rule_id else None,
            trade_id=trade_db_id,
            message=violation.message,
            severity=violation.severity,
        )
        session.add(record)

    async def _insert_pattern_alert(
        self,
        session: AsyncSession,
        alert: PatternAlert,
        trade_db_id: uuid.UUID | None,
    ) -> None:
        """Insert a persisted pattern alert."""

        record = PatternAlertRecord(
            user_id=self._user_id,
            trade_id=trade_db_id,
            pattern_type=alert.pattern_type,
            severity=alert.severity,
            message=alert.message,
            confidence=Decimal(str(alert.confidence)),
            metadata_json={"type": alert.type},
            timestamp=alert.timestamp,
        )
        session.add(record)

    async def _upsert_session_metrics(
        self,
        session: AsyncSession,
        trade_db_id: uuid.UUID | None,
        trade_timestamp: datetime,
    ) -> None:
        """Persist today's session metrics."""

        day_start = datetime(
            trade_timestamp.year,
            trade_timestamp.month,
            trade_timestamp.day,
            tzinfo=trade_timestamp.tzinfo or UTC,
        )
        day_end = day_start + timedelta(days=1)
        result = await session.execute(
            select(TradingSession).where(
                TradingSession.user_id == self._user_id,
                TradingSession.started_at >= day_start,
                TradingSession.started_at < day_end,
            )
        )
        trading_session = result.scalar_one_or_none()
        if trading_session is None:
            trading_session = TradingSession(
                user_id=self._user_id,
                started_at=trade_timestamp,
            )
            session.add(trading_session)
            await session.flush()

        trading_session.ended_at = trade_timestamp
        trading_session.trade_count = self.metrics.trade_count
        trading_session.rules_followed = self.metrics.rules_followed
        trading_session.rules_broken = self.metrics.rules_broken
        trading_session.total_pnl = self.metrics.total_pnl
        trading_session.discipline_score = self.metrics.discipline_score

        if trade_db_id is not None:
            trade = await session.get(Trade, trade_db_id)
            if trade is not None:
                trade.session_id = trading_session.id

    async def _maybe_compute_baseline(self, session: AsyncSession) -> None:
        """Compute a baseline once the user has enough historical trades."""

        from app.models.baseline import UserBaseline
        from app.tasks.baseline_compute import _compute_user_baseline_async

        baseline = await session.scalar(select(UserBaseline).where(UserBaseline.user_id == self._user_id))
        trade_count = len(
            list((await session.scalars(select(Trade).where(Trade.user_id == self._user_id))).all())
        )
        if baseline is None and self._user_id is not None and trade_count >= 30:
            await session.commit()
            await _compute_user_baseline_async(self._user_id)

    async def run(self, rules: list[EvaluatedRule], since: datetime) -> None:
        """Run the polling loop until stopped."""

        self._running = True
        cursor = since
        while self._running:
            try:
                alerts = await self.poll_once(rules, cursor)
            except Exception as exc:
                logger.warning("poll_once error: %s", exc)
                await asyncio.sleep(self.poll_interval_seconds)
                continue
            if self.metrics.last_trade_at is not None:
                cursor = self.metrics.last_trade_at
            if not alerts:
                await asyncio.sleep(self.poll_interval_seconds)

    async def stop(self) -> None:
        """Stop the polling loop."""

        self._running = False
