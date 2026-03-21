"""User baseline model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserBaseline(Base):
    """Stored behavioral baseline metrics for a user."""

    __tablename__ = "user_baselines"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_baselines_user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    trade_count: Mapped[int] = mapped_column(Integer, nullable=False)
    window_days: Mapped[int] = mapped_column(Integer, nullable=False)
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=False)

    user = relationship("User", back_populates="baseline")
