"""Trade model."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Trade(Base):
    """Normalized trade stored from broker activity."""

    __tablename__ = "trades"
    __table_args__ = (
        UniqueConstraint("user_id", "broker", "broker_trade_id", name="uq_trades_user_broker_trade"),
        Index("idx_trades_user_time", "user_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    broker: Mapped[str] = mapped_column(String(50), nullable=False)
    broker_trade_id: Mapped[str] = mapped_column(String(255), nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    side: Mapped[str] = mapped_column(String(4), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    pnl: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("trading_sessions.id"))
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="trades")
    session = relationship("TradingSession", back_populates="trades")
    violations = relationship("RuleViolationRecord", back_populates="trade")
    pattern_alerts = relationship("PatternAlertRecord", back_populates="trade")
