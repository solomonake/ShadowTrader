"""Alpaca broker adapter."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetOrdersRequest

from app.brokers.base import AccountSnapshot, BrokerAdapter, NormalizedTrade, OrderStatus, Side


class AlpacaAdapter(BrokerAdapter):
    """Async wrapper around alpaca-py trading APIs."""

    def __init__(self, paper: bool = True) -> None:
        """Initialize the adapter."""

        self.paper = paper
        self._client: TradingClient | None = None

    async def connect(self, credentials: dict) -> bool:
        """Create an Alpaca trading client and validate access."""

        api_key = credentials["api_key"]
        api_secret = credentials["api_secret"]
        paper = credentials.get("paper", self.paper)
        client = TradingClient(api_key=api_key, secret_key=api_secret, paper=paper)
        await asyncio.to_thread(client.get_account)
        self._client = client
        self.paper = paper
        return True

    async def disconnect(self) -> None:
        """Drop the in-memory client."""

        self._client = None

    async def get_recent_trades(self, since: datetime) -> list[NormalizedTrade]:
        """Fetch recent filled orders and normalize them."""

        client = self._require_client()
        request = GetOrdersRequest(
            status="all",
            after=since.astimezone(UTC),
            nested=True,
            direction="asc",
        )
        orders = await asyncio.to_thread(client.get_orders, filter=request)
        trades: list[NormalizedTrade] = []
        for order in orders:
            if getattr(order, "filled_qty", 0) in (0, "0", None):
                continue
            if getattr(order, "filled_at", None) is None:
                continue
            submitted_at = getattr(order, "filled_at", None) or getattr(order, "submitted_at", None)
            timestamp = submitted_at.astimezone(UTC) if submitted_at else datetime.now(UTC)
            qty = float(order.filled_qty)
            avg_price = float(order.filled_avg_price or 0)
            status_value = str(order.status).lower()
            normalized_status = {
                "filled": OrderStatus.FILLED,
                "partially_filled": OrderStatus.PARTIAL,
                "new": OrderStatus.PENDING,
                "canceled": OrderStatus.CANCELLED,
            }.get(status_value, OrderStatus.FILLED)
            trades.append(
                NormalizedTrade(
                    broker="alpaca",
                    broker_trade_id=str(order.id),
                    symbol=order.symbol,
                    side=Side(order.side.value),
                    quantity=qty,
                    price=avg_price,
                    timestamp=timestamp,
                    pnl=None,
                    status=normalized_status,
                    metadata={
                        "order_type": str(order.order_type),
                        "time_in_force": str(order.time_in_force),
                    },
                )
            )
        return trades

    async def get_account(self) -> AccountSnapshot:
        """Fetch the current account snapshot."""

        client = self._require_client()
        account = await asyncio.to_thread(client.get_account)
        positions = await asyncio.to_thread(client.get_all_positions)
        daily_pnl = float(account.equity) - float(account.last_equity)
        return AccountSnapshot(
            equity=float(account.equity),
            cash=float(account.cash),
            buying_power=float(account.buying_power),
            daily_pnl=daily_pnl,
            open_positions=len(positions),
        )

    async def is_connected(self) -> bool:
        """Return whether the client is initialized and responsive."""

        if self._client is None:
            return False
        try:
            await asyncio.to_thread(self._client.get_account)
        except Exception:
            return False
        return True

    def _require_client(self) -> TradingClient:
        """Return the initialized client or raise."""

        if self._client is None:
            msg = "Alpaca client is not connected."
            raise RuntimeError(msg)
        return self._client
