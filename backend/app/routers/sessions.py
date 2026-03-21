"""Session routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.billing.middleware import require_feature
from app.database import AsyncSessionLocal
from app.models.session import TradingSession
from app.routers.deps import get_session
from app.schemas.session import SessionSummaryResponse, TradingSessionRead
from app.tasks.daily_summary import generate_daily_summary_for_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[TradingSessionRead])
async def list_sessions(
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[TradingSessionRead]:
    """List sessions for a user."""

    result = await session.execute(
        select(TradingSession).where(TradingSession.user_id == user_id).order_by(TradingSession.started_at.desc())
    )
    return [TradingSessionRead.model_validate(item) for item in result.scalars().all()]


@router.post("/summary", response_model=SessionSummaryResponse, status_code=status.HTTP_201_CREATED)
async def generate_session_summary(
    user_id: UUID = Depends(require_feature("daily_summary")),
) -> SessionSummaryResponse:
    """Generate a summary for the user's current session."""

    summary = await generate_daily_summary_for_user(user_id)
    async with AsyncSessionLocal() as _session:
        result = await _session.execute(
            select(TradingSession).where(TradingSession.user_id == user_id).order_by(TradingSession.started_at.desc())
        )
        latest = result.scalars().first()
        if latest is None:
            raise HTTPException(status_code=404, detail="No session found.")
        return SessionSummaryResponse(session_id=latest.id, summary=summary)


@router.get("/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(
    session_id: UUID,
    user_id: UUID = Depends(require_feature("daily_summary")),
    session: AsyncSession = Depends(get_session),
) -> SessionSummaryResponse:
    """Return the stored summary for a session."""

    trading_session = await session.get(TradingSession, session_id)
    if trading_session is None or trading_session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found.")
    return SessionSummaryResponse(session_id=trading_session.id, summary=trading_session.summary or "")
