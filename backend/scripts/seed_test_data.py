"""Seed realistic trade history for the Phase 3 test user.

Run:
    python scripts/seed_test_data.py
"""

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import UTC, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models.baseline import UserBaseline
from app.models.chat_message import ChatMessage
from app.models.pattern_alert import PatternAlertRecord
from app.models.session import TradingSession
from app.models.trade import Trade
from app.models.user import User
from app.models.violation import RuleViolationRecord

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SYMBOLS = ["AAPL", "TSLA", "NVDA", "AMD", "META", "MSFT", "QQQ"]


def market_timestamp(day_offset: int, minute_offset: int) -> datetime:
    """Return a UTC timestamp during the US trading session."""

    base_day = datetime.now(UTC).replace(hour=14, minute=30, second=0, microsecond=0) - timedelta(days=day_offset)
    return base_day + timedelta(minutes=minute_offset)


async def main() -> None:
    """Seed 60+ trades with realistic distributions and behavioral patterns."""

    random.seed(42)
    async with AsyncSessionLocal() as session:
        existing_user = await session.get(User, TEST_USER_ID)
        if existing_user is None:
            session.add(User(id=TEST_USER_ID, email="test@shadowtrader.dev"))
            await session.flush()

        await session.execute(delete(PatternAlertRecord).where(PatternAlertRecord.user_id == TEST_USER_ID))
        await session.execute(delete(RuleViolationRecord).where(RuleViolationRecord.user_id == TEST_USER_ID))
        await session.execute(delete(ChatMessage).where(ChatMessage.user_id == TEST_USER_ID))
        await session.execute(delete(TradingSession).where(TradingSession.user_id == TEST_USER_ID))
        await session.execute(delete(UserBaseline).where(UserBaseline.user_id == TEST_USER_ID))
        await session.execute(delete(Trade).where(Trade.user_id == TEST_USER_ID))

        trades: list[Trade] = []
        for day_offset in range(30, 0, -1):
            daily_trades = random.randint(3, 8)
            if day_offset in {7, 15}:
                daily_trades = 15

            last_loss = False
            for index in range(daily_trades):
                timestamp = market_timestamp(day_offset, random.randint(0, 360))
                quantity = Decimal(str(random.choice([25, 50, 75, 100, 150, 200])))
                price = Decimal(str(round(random.uniform(20, 350), 2)))
                pnl = Decimal(str(round(random.gauss(-12, 95), 2)))

                if day_offset in {5, 12} and index in {1, 2}:
                    # Force revenge-like sequences.
                    timestamp = market_timestamp(day_offset, 45 + index * 5)
                    price = Decimal("100")
                    quantity = Decimal(str(150 + index * 100))
                    pnl = Decimal("-120.00") if index == 1 else Decimal("85.00")
                elif last_loss and random.random() < 0.25:
                    quantity *= Decimal("1.8")
                    timestamp += timedelta(minutes=4)
                    pnl = Decimal(str(round(random.gauss(-25, 105), 2)))

                trade = Trade(
                    user_id=TEST_USER_ID,
                    broker="alpaca",
                    broker_trade_id=f"seed-{day_offset}-{index}",
                    symbol=random.choice(SYMBOLS),
                    side=random.choice(["buy", "sell"]),
                    quantity=quantity,
                    price=price,
                    pnl=pnl,
                    timestamp=timestamp,
                    metadata_json={"setup_tag": random.choice(["breakout", "pullback", "opening_range"])},
                )
                trades.append(trade)
                last_loss = pnl < 0

        session.add_all(trades)
        await session.commit()
        print(f"Seeded {len(trades)} trades for {TEST_USER_ID}")


if __name__ == "__main__":
    asyncio.run(main())
