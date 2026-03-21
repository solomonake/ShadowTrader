"""Alert routes and WebSocket endpoint."""

from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.models.violation import RuleViolationRecord
from app.routers.deps import get_session
from app.schemas.alert import RuleViolationRead

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=list[RuleViolationRead])
async def list_alerts(
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> list[RuleViolationRead]:
    """List recent rule violations for a user."""

    result = await session.execute(
        select(RuleViolationRecord)
        .where(RuleViolationRecord.user_id == user_id)
        .order_by(RuleViolationRecord.timestamp.desc())
    )
    return [RuleViolationRead.model_validate(item) for item in result.scalars().all()]


@router.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket) -> None:
    """Stream live alerts."""

    alert_hub = websocket.app.state.alert_hub
    await alert_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        await alert_hub.disconnect(websocket)
