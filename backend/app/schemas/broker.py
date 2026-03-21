"""Broker account schemas."""

from pydantic import BaseModel, Field


class AccountSnapshotRead(BaseModel):
    """Broker account snapshot response."""

    equity: float
    cash: float
    buying_power: float
    daily_pnl: float
    open_positions: int


class BrokerStatusRead(BaseModel):
    """Broker connection status response."""

    broker: str
    connected: bool
    is_paper: bool
    snapshot: AccountSnapshotRead | None = None
    error: str | None = None


class BrokerConnectRequest(BaseModel):
    """Broker connection request."""

    broker: str
    credentials: dict = Field(default_factory=dict)
    is_paper: bool = True
