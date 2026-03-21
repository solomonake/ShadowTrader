"""Chat schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Incoming coaching chat request."""

    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """Coaching chat response."""

    response: str
    reflection_question: str
    context_used: dict


class ChatMessageRead(BaseModel):
    """Stored chat message response."""

    id: UUID
    user_id: UUID
    role: str
    content: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class ChatError(BaseModel):
    """Chat configuration error response."""

    error: str
