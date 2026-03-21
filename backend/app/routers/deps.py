"""Router dependencies."""

from __future__ import annotations

import uuid

from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session


async def get_session(session: AsyncSession = Depends(get_db_session)) -> AsyncSession:
    """Yield a database session dependency."""

    return session


def get_fernet() -> Fernet:
    """Return the configured credential cipher."""

    return Fernet(get_settings().fernet_key.encode())


def get_alert_hub(request: Request):
    """Return the shared alert hub instance."""

    return request.app.state.alert_hub


def get_user_id_header(request: Request) -> uuid.UUID:
    """Extract a user id from the request header."""

    raw_user_id = request.headers.get("x-user-id")
    if raw_user_id is None:
        raise HTTPException(status_code=400, detail="x-user-id header is required.")
    try:
        return uuid.UUID(raw_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid x-user-id header.") from exc
