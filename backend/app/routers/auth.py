"""Authentication-related routes."""

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user_id
from app.schemas.common import APIMessage

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/health", response_model=APIMessage)
async def auth_healthcheck() -> APIMessage:
    """Return a simple auth router health response."""

    return APIMessage(message="auth router ok")


@router.get("/me")
async def get_authenticated_user(user_id=Depends(get_current_user_id)) -> dict[str, str]:
    """Return the authenticated user id."""

    return {"user_id": str(user_id)}
