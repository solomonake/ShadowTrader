"""Daily summary tasks."""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from app.celery_app import celery_app
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.session import TradingSession
from app.models.trade import Trade
from app.services.trader_analytics import (
    compute_discipline_score_today,
    format_patterns_for_summary,
    format_violations_for_summary,
    get_enabled_rules_count,
    get_today_pattern_alerts,
    get_today_violations,
    get_trades_today,
    get_user_baseline,
    total_pnl,
    utc_day_bounds,
)


async def generate_daily_summary_for_user(user_id: uuid.UUID) -> str:
    """Generate and store an end-of-day summary for a user."""

    settings = get_settings()
    async with AsyncSessionLocal() as session:
        trades = await get_trades_today(session, user_id)
        violations = await get_today_violations(session, user_id)
        patterns = await get_today_pattern_alerts(session, user_id)
        baseline = await get_user_baseline(session, user_id)
        enabled_rules_count = await get_enabled_rules_count(session, user_id)
        day_start, day_end = utc_day_bounds()
        latest_session = await session.scalar(
            select(TradingSession).where(
                TradingSession.user_id == user_id,
                TradingSession.started_at >= day_start,
                TradingSession.started_at < day_end,
            )
        )

        if not trades:
            return "No trades today."

        discipline_score = compute_discipline_score_today(
            trades_count=len(trades),
            violations_count=len(violations),
            enabled_rules_count=enabled_rules_count,
        )

        winners = sum(1 for trade in trades if trade.pnl and trade.pnl > 0)
        losers = sum(1 for trade in trades if trade.pnl and trade.pnl < 0)
        total_session_pnl = float(total_pnl(trades))
        prompt = f"""
Summarize this trading session for the trader. Be specific with numbers.
Include: what went well, what rules were broken, patterns detected, and 3 reflection questions.
Keep it under 300 words. Be direct and constructive.

SESSION DATA:
- Trades: {len(trades)}
- Winners: {winners}
- Losers: {losers}
- Total P&L: ${total_session_pnl:,.2f}
- Rules broken: {len(violations)}
- Violations: {format_violations_for_summary(violations)}
- Patterns detected: {format_patterns_for_summary(patterns)}
- Discipline score: {discipline_score:.1f}%
- Overall baseline win rate: {baseline.metrics.get('overall_win_rate', 'N/A') if baseline else 'N/A'}
"""

        if settings.anthropic_api_key:
            import anthropic

            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            response = await asyncio.to_thread(
                client.messages.create,
                model=settings.anthropic_model,
                max_tokens=600,
                system="You are a trading performance analyst. Write concise, data-driven session summaries.",
                messages=[{"role": "user", "content": prompt}],
            )
            summary_text = "".join(getattr(block, "text", "") for block in response.content)
        else:
            summary_text = (
                f"You took {len(trades)} trades today with {winners} winners and {losers} losers, "
                f"finishing at ${total_session_pnl:,.2f}. You broke {len(violations)} rules and triggered "
                f"{len(patterns)} pattern alerts. Your discipline score was {discipline_score:.1f}%. "
                "Reflection questions: What changed after your first emotional impulse? "
                "Which rule mattered most today? What would you repeat or remove tomorrow?"
            )

        if latest_session is None:
            latest_session = TradingSession(
                user_id=user_id,
                started_at=trades[0].timestamp,
                ended_at=trades[-1].timestamp,
                trade_count=len(trades),
                rules_followed=max((len(trades) * enabled_rules_count) - len(violations), 0),
                rules_broken=len(violations),
                total_pnl=total_pnl(trades),
                discipline_score=discipline_score,
                summary=summary_text,
            )
            session.add(latest_session)
        else:
            latest_session.ended_at = trades[-1].timestamp
            latest_session.trade_count = len(trades)
            latest_session.rules_followed = max((len(trades) * enabled_rules_count) - len(violations), 0)
            latest_session.rules_broken = len(violations)
            latest_session.total_pnl = total_pnl(trades)
            latest_session.discipline_score = discipline_score
            latest_session.summary = summary_text

        await session.commit()
        return summary_text


@celery_app.task
def generate_daily_summary(user_id: str) -> str:
    """Generate end-of-day narrative summary using AI."""

    return asyncio.run(generate_daily_summary_for_user(uuid.UUID(user_id)))


@celery_app.task
def generate_all_summaries() -> int:
    """Generate summaries for all users with trades today."""

    return asyncio.run(_generate_all_summaries_async())


async def _generate_all_summaries_async() -> int:
    """Async implementation of daily summary generation for all active users."""

    start, end = utc_day_bounds()
    async with AsyncSessionLocal() as session:
        user_ids = list(
            (
                await session.scalars(
                    select(Trade.user_id)
                    .where(Trade.timestamp >= start, Trade.timestamp < end)
                    .distinct()
                )
            ).all()
        )

    generated = 0
    for user_id in user_ids:
        result = await generate_daily_summary_for_user(user_id)
        if result and result != "No trades today.":
            generated += 1
    return generated
