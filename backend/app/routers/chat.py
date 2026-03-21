"""AI coaching chat routes."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.billing.middleware import require_feature
from app.models.chat_message import ChatMessage
from app.routers.deps import get_session
from app.schemas.chat import ChatError, ChatMessageRead, ChatRequest, ChatResponse
from app.services.ai_coach import AICoachService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, responses={503: {"model": ChatError}})
async def send_chat_message(
    payload: ChatRequest,
    user_id=Depends(require_feature("chat")),
    session: AsyncSession = Depends(get_session),
):
    """Send a message to the AI coach."""

    coach = AICoachService(session)
    try:
        result = await coach.get_coaching_response(user_id, payload.message)
    except RuntimeError as exc:
        return JSONResponse(status_code=503, content={"error": str(exc)})
    return ChatResponse(**result)


@router.get("/history", response_model=list[ChatMessageRead])
async def get_chat_history(
    user_id=Depends(require_feature("chat")),
    session: AsyncSession = Depends(get_session),
) -> list[ChatMessageRead]:
    """Return stored chat history."""

    statement = (
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = list((await session.scalars(statement)).all())
    return [
        ChatMessageRead(
            id=message.id,
            user_id=message.user_id,
            role=message.role,
            content=message.content,
            metadata=message.metadata_json,
            created_at=message.created_at,
        )
        for message in messages
    ]
