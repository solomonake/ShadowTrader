"""FastAPI entrypoint."""

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import UTC, datetime

from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import text
from sqlalchemy import select

from app.brokers import get_broker_adapter
from app.celery_app import celery_app
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.broker_connection import BrokerConnection
from app.models.rule import Rule
from app.billing.webhooks import router as billing_router
from app.routers import alerts, auth, broker, rules, sessions, trades
from app.routers.chat import router as chat_router
from app.schemas.common import RuleType
from app.services.rule_engine import EvaluatedRule
from app.services.session_tracker import SessionTracker
from app.ws.alert_hub import AlertHub

logger = logging.getLogger(__name__)

# The single test user wired for Phase 1 polling
_TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def _load_rules_for_user(user_id: uuid.UUID) -> list[EvaluatedRule]:
    """Load all enabled rules from the DB for a user."""

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Rule).where(Rule.user_id == user_id, Rule.enabled.is_(True))
        )
        return [
            EvaluatedRule(
                id=r.id,
                rule_type=RuleType(r.rule_type),
                severity=r.severity,
                params=r.params,
                enabled=r.enabled,
            )
            for r in result.scalars().all()
        ]


def _decrypt_credentials(fernet: Fernet, credentials: dict) -> dict:
    """Decrypt persisted broker credentials."""

    encrypted = credentials.get("payload")
    if encrypted is None:
        return credentials
    payload = fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")
    return json.loads(payload)


async def _load_saved_broker_connection(
    user_id: uuid.UUID,
    fernet: Fernet,
) -> BrokerConnection | None:
    """Return the latest saved broker connection for a user."""

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(BrokerConnection)
            .where(BrokerConnection.user_id == user_id)
            .order_by(BrokerConnection.created_at.desc())
        )
        connection = result.scalars().first()
        if connection is None:
            return None
        connection.credentials = _decrypt_credentials(fernet, connection.credentials)
        return connection


def _startup_tracker_bootstrap_enabled() -> bool:
    """Return whether the dev polling bootstrap should run."""

    settings = get_settings()
    return settings.environment == "development" or settings.auth_mode == "dev"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Attach shared runtime state and start the broker polling loop."""

    app.state.alert_hub = AlertHub()
    settings = get_settings()
    fernet = Fernet(settings.fernet_key.encode())
    poll_task = None

    async def _start_tracker_for_connection(
        broker_name: str,
        credentials: dict,
        is_paper: bool,
    ) -> None:
        nonlocal poll_task
        print(f"[ShadowTrader] Connecting to {broker_name} (paper={is_paper})...", flush=True)
        broker_adapter = get_broker_adapter(broker_name)
        await broker_adapter.connect(credentials)
        user_rules = await _load_rules_for_user(_TEST_USER_ID)
        tracker = SessionTracker(
            broker=broker_adapter,
            alert_hub=app.state.alert_hub,
            poll_interval_seconds=settings.session_poll_interval_seconds,
            user_id=_TEST_USER_ID,
            db_factory=AsyncSessionLocal,
        )
        app.state.tracker = tracker
        since = datetime.now(UTC)
        poll_task = asyncio.create_task(tracker.run(user_rules, since))
        print(
            f"[ShadowTrader] Polling loop started for user {_TEST_USER_ID} "
            f"on {broker_name} with {len(user_rules)} rule(s). "
            f"Polling every {settings.session_poll_interval_seconds}s.",
            flush=True,
        )
        logger.info(
            "Polling loop started for user %s on broker %s with %d rule(s)",
            _TEST_USER_ID,
            broker_name,
            len(user_rules),
        )

    if _startup_tracker_bootstrap_enabled():
        try:
            saved_connection = await _load_saved_broker_connection(_TEST_USER_ID, fernet)
        except Exception as exc:
            saved_connection = None
            print(f"[ShadowTrader] ERROR: Could not load saved broker connection: {exc}", flush=True)
            logger.warning("Could not load saved broker connection: %s", exc)

        if saved_connection is not None:
            try:
                await _start_tracker_for_connection(
                    broker_name=saved_connection.broker,
                    credentials=saved_connection.credentials,
                    is_paper=saved_connection.is_paper,
                )
            except Exception as exc:
                print(f"[ShadowTrader] ERROR: Could not start saved broker polling loop: {exc}", flush=True)
                logger.warning("Could not start saved broker polling loop: %s", exc)

        if poll_task is None and settings.alpaca_api_key and settings.alpaca_secret_key:
            try:
                await _start_tracker_for_connection(
                    broker_name="alpaca",
                    credentials={
                        "api_key": settings.alpaca_api_key,
                        "api_secret": settings.alpaca_secret_key,
                        "paper": True,
                    },
                    is_paper=True,
                )
            except Exception as exc:
                print(f"[ShadowTrader] ERROR: Could not start Alpaca polling loop: {exc}", flush=True)
                logger.warning("Could not start Alpaca polling loop: %s", exc)

    yield

    if poll_task is not None:
        if hasattr(app.state, "tracker"):
            await app.state.tracker.stop()
        poll_task.cancel()
        with suppress(asyncio.CancelledError):
            await poll_task


def create_app() -> FastAPI:
    """Create the FastAPI application."""

    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    )
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(billing_router, prefix=settings.api_prefix)
    app.include_router(broker.router, prefix=settings.api_prefix)
    app.include_router(chat_router, prefix=settings.api_prefix)
    app.include_router(rules.router, prefix=settings.api_prefix)
    app.include_router(trades.router, prefix=settings.api_prefix)
    app.include_router(sessions.router, prefix=settings.api_prefix)
    app.include_router(alerts.router)

    @app.get("/health")
    async def health() -> dict:
        """Return a health response."""

        database_ok = False
        redis_ok = False
        broker_connected = False
        celery_worker_ok = False

        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            database_ok = True
        except Exception:
            database_ok = False

        try:
            redis_client = redis_from_url(settings.redis_url)
            redis_ok = bool(await redis_client.ping())
            await redis_client.close()
        except Exception:
            redis_ok = False

        try:
            if hasattr(app.state, "tracker"):
                broker_connected = await app.state.tracker.broker.is_connected()
        except Exception:
            broker_connected = False

        try:
            inspector = celery_app.control.inspect()
            pings = await asyncio.to_thread(inspector.ping)
            celery_worker_ok = bool(pings)
        except Exception:
            celery_worker_ok = False

        return {
            "status": "ok" if database_ok and redis_ok else "degraded",
            "database": database_ok,
            "redis": redis_ok,
            "broker_connected": broker_connected,
            "celery_worker": celery_worker_ok,
            "version": settings.app_version,
        }

    return app


app = create_app()
