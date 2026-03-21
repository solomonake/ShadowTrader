"""Broker adapter abstractions."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Side(str, Enum):
    """Supported trade sides."""

    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, Enum):
    """Supported order states."""

    FILLED = "filled"
    PARTIAL = "partial"
    PENDING = "pending"
    CANCELLED = "cancelled"


@dataclass
class NormalizedTrade:
    """Broker-agnostic normalized trade event."""

    broker: str
    broker_trade_id: str
    symbol: str
    side: Side
    quantity: float
    price: float
    timestamp: datetime
    pnl: float | None = None
    status: OrderStatus = OrderStatus.FILLED
    metadata: dict = field(default_factory=dict)


@dataclass
class AccountSnapshot:
    """Broker-agnostic account snapshot."""

    equity: float
    cash: float
    buying_power: float
    daily_pnl: float
    open_positions: int


class BrokerAdapter(ABC):
    """Abstract broker adapter."""

    @abstractmethod
    async def connect(self, credentials: dict) -> bool:
        """Connect to the broker."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the broker."""

    @abstractmethod
    async def get_recent_trades(self, since: datetime) -> list[NormalizedTrade]:
        """Return trades since the provided UTC timestamp."""

    @abstractmethod
    async def get_account(self) -> AccountSnapshot:
        """Return a broker account snapshot."""

    @abstractmethod
    async def is_connected(self) -> bool:
        """Return whether the adapter is connected."""
