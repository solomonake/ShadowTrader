"""Shared trader analytics helpers."""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.baseline import UserBaseline
from app.models.pattern_alert import PatternAlertRecord
from app.models.rule import Rule
from app.models.session import TradingSession
from app.models.trade import Trade
from app.models.violation import RuleViolationRecord


def utc_day_bounds(reference: datetime | None = None) -> tuple[datetime, datetime]:
    """Return the UTC start and end bounds for a calendar day."""

    now = (reference or datetime.now(UTC)).astimezone(UTC)
    start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    return start, start + timedelta(days=1)


async def get_user_baseline(session: AsyncSession, user_id: uuid.UUID) -> UserBaseline | None:
    """Return the stored user baseline."""

    return await session.scalar(select(UserBaseline).where(UserBaseline.user_id == user_id))


async def get_trades_between(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: datetime,
    end: datetime,
) -> list[Trade]:
    """Return trades for a user in a time range."""

    statement: Select[tuple[Trade]] = (
        select(Trade)
        .where(Trade.user_id == user_id, Trade.timestamp >= start, Trade.timestamp < end)
        .order_by(Trade.timestamp.asc())
    )
    return list((await session.scalars(statement)).all())


async def get_trades_today(session: AsyncSession, user_id: uuid.UUID) -> list[Trade]:
    """Return today's trades for a user."""

    start, end = utc_day_bounds()
    return await get_trades_between(session, user_id, start, end)


async def get_today_violations(session: AsyncSession, user_id: uuid.UUID) -> list[RuleViolationRecord]:
    """Return today's rule violations for a user."""

    start, end = utc_day_bounds()
    statement = (
        select(RuleViolationRecord)
        .where(
            RuleViolationRecord.user_id == user_id,
            RuleViolationRecord.timestamp >= start,
            RuleViolationRecord.timestamp < end,
        )
        .order_by(RuleViolationRecord.timestamp.asc())
    )
    return list((await session.scalars(statement)).all())


async def get_today_pattern_alerts(session: AsyncSession, user_id: uuid.UUID) -> list[PatternAlertRecord]:
    """Return today's pattern alerts for a user."""

    start, end = utc_day_bounds()
    statement = (
        select(PatternAlertRecord)
        .where(
            PatternAlertRecord.user_id == user_id,
            PatternAlertRecord.timestamp >= start,
            PatternAlertRecord.timestamp < end,
        )
        .order_by(PatternAlertRecord.timestamp.asc())
    )
    return list((await session.scalars(statement)).all())


async def get_recent_sessions(
    session: AsyncSession,
    user_id: uuid.UUID,
    days: int = 7,
) -> list[TradingSession]:
    """Return recent sessions for a user."""

    since = datetime.now(UTC) - timedelta(days=days)
    statement = (
        select(TradingSession)
        .where(TradingSession.user_id == user_id, TradingSession.started_at >= since)
        .order_by(TradingSession.started_at.desc())
    )
    return list((await session.scalars(statement)).all())


async def get_recent_pattern_alerts(
    session: AsyncSession,
    user_id: uuid.UUID,
    days: int = 7,
) -> list[PatternAlertRecord]:
    """Return recent persisted pattern alerts for a user."""

    since = datetime.now(UTC) - timedelta(days=days)
    statement = (
        select(PatternAlertRecord)
        .where(PatternAlertRecord.user_id == user_id, PatternAlertRecord.timestamp >= since)
        .order_by(PatternAlertRecord.timestamp.desc())
    )
    return list((await session.scalars(statement)).all())


async def get_enabled_rules_count(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Return the number of enabled rules for a user."""

    statement = select(Rule).where(Rule.user_id == user_id, Rule.enabled.is_(True))
    return len(list((await session.scalars(statement)).all()))


async def get_latest_session(session: AsyncSession, user_id: uuid.UUID) -> TradingSession | None:
    """Return the latest session for a user."""

    statement = (
        select(TradingSession)
        .where(TradingSession.user_id == user_id)
        .order_by(TradingSession.started_at.desc())
        .limit(1)
    )
    return await session.scalar(statement)


def compute_discipline_score_today(
    trades_count: int,
    violations_count: int,
    enabled_rules_count: int,
) -> float:
    """Compute today's discipline score."""

    total_checks = trades_count * enabled_rules_count
    if total_checks <= 0:
        return 100.0
    return round(((total_checks - violations_count) / total_checks) * 100, 2)


def summarize_violations(violations: list[RuleViolationRecord]) -> str:
    """Summarize the most common rule violations."""

    if not violations:
        return "none"
    counts = Counter(violation.message for violation in violations)
    top = counts.most_common(3)
    return "; ".join(f"{message} ({count})" for message, count in top)


def summarize_patterns(patterns: list[PatternAlertRecord]) -> str:
    """Summarize the recent pattern alerts."""

    if not patterns:
        return "none"
    counts = Counter(alert.pattern_type for alert in patterns)
    top = counts.most_common(3)
    return "; ".join(f"{pattern_type} ({count})" for pattern_type, count in top)


def format_trend(sessions: list[TradingSession]) -> str:
    """Format a short discipline trend summary."""

    scores = [float(session.discipline_score) for session in sessions if session.discipline_score is not None]
    if not scores:
        return "No recent score history."
    return " → ".join(f"{score:.1f}%" for score in reversed(scores[:7]))


def format_violations_for_summary(violations: list[RuleViolationRecord]) -> str:
    """Format violations for summary prompts."""

    if not violations:
        return "None."
    return "; ".join(violation.message for violation in violations[:8])


def format_patterns_for_summary(patterns: list[PatternAlertRecord]) -> str:
    """Format patterns for summary prompts."""

    if not patterns:
        return "None."
    return "; ".join(alert.message for alert in patterns[:8])


def total_pnl(trades: list[Trade]) -> Decimal:
    """Return total P&L for a trade list."""

    return sum((trade.pnl or Decimal("0")) for trade in trades)


def trades_requiring_baseline(session_trades: list[Trade]) -> bool:
    """Return whether the user has enough trades for baseline computation."""

    settings = get_settings()
    return len(session_trades) >= settings.minimum_baseline_trades
