"""Behavioral baseline computation tasks."""

from __future__ import annotations

import asyncio
import statistics
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.celery_app import celery_app
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.baseline import UserBaseline
from app.models.trade import Trade


def _mean(values: list[float]) -> float:
    return round(statistics.fmean(values), 2) if values else 0.0


def _std(values: list[float]) -> float:
    return round(statistics.pstdev(values), 2) if len(values) > 1 else 0.0


async def _compute_user_baseline_async(user_id: uuid.UUID) -> dict | None:
    """Compute baseline metrics asynchronously."""

    settings = get_settings()
    since = datetime.now(UTC) - timedelta(days=settings.baseline_window_days)

    async with AsyncSessionLocal() as session:
        statement = (
            select(Trade)
            .where(Trade.user_id == user_id, Trade.timestamp >= since)
            .order_by(Trade.timestamp.asc())
        )
        trades = list((await session.scalars(statement)).all())
        if len(trades) < settings.minimum_baseline_trades:
            return None

        today = datetime.now(UTC).date()
        total_days = (today - since.date()).days + 1
        days = [since.date() + timedelta(days=offset) for offset in range(total_days)]
        counts_by_day = {day: 0 for day in days}
        hourly_counts_by_day: dict[str, dict] = {
            day.isoformat(): {f"{hour:02d}": 0 for hour in range(24)}
            for day in days
        }
        hourly_pnls: dict[str, list[float]] = defaultdict(list)
        hourly_wins: dict[str, list[int]] = defaultdict(list)
        intervals: list[float] = []
        sizes: list[float] = []
        after_loss_results: list[int] = []
        after_loss_sizes: list[float] = []
        after_win_sizes: list[float] = []
        win_rate_after_streak: dict[str, list[int]] = defaultdict(list)
        loss_streak = 0
        longest_loss_streak = 0
        previous_trade: Trade | None = None

        for trade in trades:
            trade_day = trade.timestamp.astimezone(UTC).date().isoformat()
            trade_hour = trade.timestamp.astimezone(UTC).strftime("%H")
            counts_by_day[trade.timestamp.astimezone(UTC).date()] += 1
            hourly_counts_by_day[trade_day][trade_hour] += 1

            size = float(trade.quantity * trade.price)
            sizes.append(size)
            if trade.pnl is not None:
                pnl_float = float(trade.pnl)
                hourly_pnls[trade_hour].append(pnl_float)
                hourly_wins[trade_hour].append(1 if pnl_float > 0 else 0)
                if pnl_float < 0:
                    loss_streak += 1
                    longest_loss_streak = max(longest_loss_streak, loss_streak)
                else:
                    if loss_streak >= 2:
                        win_rate_after_streak[str(min(loss_streak, 4))].append(1 if pnl_float > 0 else 0)
                    loss_streak = 0

            if previous_trade is not None:
                intervals.append((trade.timestamp - previous_trade.timestamp).total_seconds() / 60)
                previous_pnl = float(previous_trade.pnl or 0)
                if previous_pnl < 0:
                    after_loss_results.append(1 if float(trade.pnl or 0) > 0 else 0)
                    after_loss_sizes.append(size)
                elif previous_pnl > 0:
                    after_win_sizes.append(size)
            previous_trade = trade

        daily_counts = [float(count) for count in counts_by_day.values()]
        hourly_means: dict[str, float] = {}
        hourly_stds: dict[str, float] = {}
        for hour in range(24):
            hour_key = f"{hour:02d}"
            values = [float(day_counts[hour_key]) for day_counts in hourly_counts_by_day.values()]
            hourly_means[hour_key] = _mean(values)
            hourly_stds[hour_key] = _std(values)

        overall_wins = [1 if float(trade.pnl or 0) > 0 else 0 for trade in trades if trade.pnl is not None]
        metrics = {
            "avg_trades_per_day": _mean(daily_counts),
            "std_trades_per_day": _std(daily_counts),
            "avg_trades_per_hour": hourly_means,
            "std_trades_per_hour": hourly_stds,
            "avg_time_between_trades_minutes": _mean(intervals),
            "std_time_between_trades_minutes": _std(intervals),
            "avg_position_size": _mean(sizes),
            "std_position_size": _std(sizes),
            "overall_win_rate": round(sum(overall_wins) / len(overall_wins), 2) if overall_wins else 0.0,
            "win_rate_by_hour": {
                hour: round(sum(results) / len(results), 2) if results else 0.0
                for hour, results in hourly_wins.items()
            },
            "win_rate_after_loss": round(sum(after_loss_results) / len(after_loss_results), 2)
            if after_loss_results
            else 0.0,
            "win_rate_after_consecutive_losses": {
                streak: round(sum(results) / len(results), 2) if results else 0.0
                for streak, results in win_rate_after_streak.items()
            },
            "avg_size_after_loss": _mean(after_loss_sizes),
            "avg_size_after_win": _mean(after_win_sizes),
            "avg_pnl_by_hour": {
                hour: round(sum(values) / len(values), 2) if values else 0.0
                for hour, values in hourly_pnls.items()
            },
            "longest_loss_streak": longest_loss_streak,
            "total_trades_analyzed": len(trades),
        }

        baseline = await session.scalar(select(UserBaseline).where(UserBaseline.user_id == user_id))
        if baseline is None:
            baseline = UserBaseline(
                user_id=user_id,
                trade_count=len(trades),
                window_days=settings.baseline_window_days,
                metrics=metrics,
            )
            session.add(baseline)
        else:
            baseline.trade_count = len(trades)
            baseline.window_days = settings.baseline_window_days
            baseline.metrics = metrics
            baseline.computed_at = datetime.now(UTC)
        await session.commit()
        return metrics


@celery_app.task
def compute_user_baseline(user_id: str) -> dict | None:
    """Compute behavioral baselines from last 90 days of trades."""

    return asyncio.run(_compute_user_baseline_async(uuid.UUID(user_id)))


@celery_app.task
def compute_all_baselines() -> int:
    """Nightly job: recompute baselines for all active users."""

    return asyncio.run(_compute_all_baselines_async())


async def _compute_all_baselines_async() -> int:
    """Async implementation of baseline recomputation for all users."""

    settings = get_settings()
    since = datetime.now(UTC) - timedelta(days=settings.baseline_window_days)
    async with AsyncSessionLocal() as session:
        user_ids = list(
            (
                await session.scalars(
                    select(Trade.user_id).where(Trade.timestamp >= since).distinct()
                )
            ).all()
        )

    processed = 0
    for user_id in user_ids:
        result = await _compute_user_baseline_async(user_id)
        if result is not None:
            processed += 1
    return processed
