"""Broker-related routes."""

from __future__ import annotations

import json
from uuid import UUID

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user_id
from app.brokers import get_broker_adapter
from app.models.broker_connection import BrokerConnection
from app.routers.deps import get_fernet, get_session
from app.schemas.broker import BrokerConnectRequest, BrokerStatusRead

router = APIRouter(prefix="/broker", tags=["broker"])


def _encrypt_credentials(fernet: Fernet, credentials: dict) -> dict:
    payload = json.dumps(credentials).encode("utf-8")
    return {"payload": fernet.encrypt(payload).decode("utf-8")}


def _decrypt_credentials(fernet: Fernet, credentials: dict) -> dict:
    encrypted = credentials.get("payload")
    if encrypted is None:
        return credentials
    payload = fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")
    return json.loads(payload)


async def _load_connection(
    session: AsyncSession,
    user_id: UUID,
    broker_name: str | None,
) -> BrokerConnection | None:
    statement = select(BrokerConnection).where(BrokerConnection.user_id == user_id)
    if broker_name:
        statement = statement.where(BrokerConnection.broker == broker_name)
    statement = statement.order_by(BrokerConnection.created_at.desc())
    return await session.scalar(statement)


async def _test_connection(payload: BrokerConnectRequest) -> BrokerStatusRead:
    adapter = get_broker_adapter(payload.broker)
    try:
        await adapter.connect(payload.credentials)
        snapshot = await adapter.get_account()
        connected = await adapter.is_connected()
        return BrokerStatusRead(
            broker=payload.broker,
            connected=connected,
            is_paper=payload.is_paper,
            snapshot={
                "equity": snapshot.equity,
                "cash": snapshot.cash,
                "buying_power": snapshot.buying_power,
                "daily_pnl": snapshot.daily_pnl,
                "open_positions": snapshot.open_positions,
            },
        )
    except Exception as exc:
        return BrokerStatusRead(
            broker=payload.broker,
            connected=False,
            is_paper=payload.is_paper,
            snapshot=None,
            error=str(exc),
        )
    finally:
        await adapter.disconnect()


@router.get("/status", response_model=BrokerStatusRead)
async def broker_status(
    broker_name: str | None = Query(default=None, alias="broker"),
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    fernet: Fernet = Depends(get_fernet),
) -> BrokerStatusRead:
    """Return stored broker connection status and current account snapshot."""

    connection = await _load_connection(session, user_id, broker_name)
    if connection is None:
        return BrokerStatusRead(
            broker=broker_name or "alpaca",
            connected=False,
            is_paper=True,
            snapshot=None,
            error="No broker connection saved.",
        )

    payload = BrokerConnectRequest(
        broker=connection.broker,
        credentials=_decrypt_credentials(fernet, connection.credentials),
        is_paper=connection.is_paper,
    )
    result = await _test_connection(payload)
    connection.connected = result.connected
    await session.commit()
    return result


@router.post("/test", response_model=BrokerStatusRead)
async def test_broker_connection(
    payload: BrokerConnectRequest,
    user_id: UUID = Depends(get_current_user_id),
) -> BrokerStatusRead:
    """Test broker connectivity with supplied credentials."""

    _ = user_id
    result = await _test_connection(payload)
    if not result.connected:
        raise HTTPException(status_code=503, detail=result.error or "Broker connection failed.")
    return result


@router.post("/connect", response_model=BrokerStatusRead, status_code=status.HTTP_201_CREATED)
async def connect_broker(
    payload: BrokerConnectRequest,
    user_id: UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
    fernet: Fernet = Depends(get_fernet),
) -> BrokerStatusRead:
    """Persist broker credentials after validating the connection."""

    result = await _test_connection(payload)
    if not result.connected:
        raise HTTPException(status_code=503, detail=result.error or "Broker connection failed.")

    connection = await session.scalar(
        select(BrokerConnection).where(
            BrokerConnection.user_id == user_id,
            BrokerConnection.broker == payload.broker,
        )
    )
    if connection is None:
        connection = BrokerConnection(
            user_id=user_id,
            broker=payload.broker,
            credentials=_encrypt_credentials(fernet, payload.credentials),
            is_paper=payload.is_paper,
            connected=True,
        )
        session.add(connection)
    else:
        connection.credentials = _encrypt_credentials(fernet, payload.credentials)
        connection.is_paper = payload.is_paper
        connection.connected = True
    await session.commit()
    return result
