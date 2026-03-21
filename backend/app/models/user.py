"""User model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Platform user."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    broker_connections = relationship("BrokerConnection", back_populates="user", cascade="all, delete-orphan")
    rules = relationship("Rule", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("TradingSession", back_populates="user", cascade="all, delete-orphan")
    violations = relationship("RuleViolationRecord", back_populates="user", cascade="all, delete-orphan")
    baseline = relationship("UserBaseline", back_populates="user", cascade="all, delete-orphan", uselist=False)
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    pattern_alerts = relationship("PatternAlertRecord", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", cascade="all, delete-orphan", uselist=False)
