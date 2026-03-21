"""Trade routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.models.trade import Trade
from app.routers.deps import get_session
from app.schemas.trade import TradeCreate, TradeRead

router = APIRouter(prefix="/trades", tags=["trades"])


@router.post("", response_model=TradeRead, status_code=status.HTTP_201_CREATED)
async def create_trade(
    payload: TradeCreate,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TradeRead:
    """Create a trade record."""

    trade = Trade(
        user_id=user_id,
        broker=payload.broker,
        broker_trade_id=payload.broker_trade_id,
        symbol=payload.symbol,
        side=payload.side,
        quantity=payload.quantity,
        price=payload.price,
        pnl=payload.pnl,
        timestamp=payload.timestamp,
        session_id=payload.session_id,
        metadata_json=payload.metadata,
    )
    session.add(trade)
    await session.commit()
    await session.refresh(trade)
    return TradeRead.model_validate(trade, from_attributes=True)


@router.get("", response_model=list[TradeRead])
async def list_trades(
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[TradeRead]:
    """List trades for a user."""

    result = await session.execute(select(Trade).where(Trade.user_id == user_id).order_by(Trade.timestamp.desc()))
    trades = result.scalars().all()
    return [
        TradeRead(
            id=trade.id,
            user_id=trade.user_id,
            broker=trade.broker,
            broker_trade_id=trade.broker_trade_id,
            symbol=trade.symbol,
            side=trade.side,
            quantity=trade.quantity,
            price=trade.price,
            pnl=trade.pnl,
            timestamp=trade.timestamp,
            session_id=trade.session_id,
            metadata=trade.metadata_json,
        )
        for trade in trades
    ]
