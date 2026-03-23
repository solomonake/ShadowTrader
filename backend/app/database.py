"""Database configuration and helpers."""

from collections.abc import AsyncGenerator

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


settings = get_settings()
# Railway (and some other hosts) inject DATABASE_URL as `postgresql://` without a driver
# specifier. SQLAlchemy async requires the `+asyncpg` dialect suffix.
_db_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
engine: AsyncEngine = create_async_engine(_db_url, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""

    async with AsyncSessionLocal() as session:
        yield session
