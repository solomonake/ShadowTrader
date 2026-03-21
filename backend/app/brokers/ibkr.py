"""Interactive Brokers adapter."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from app.brokers.base import AccountSnapshot, BrokerAdapter, NormalizedTrade, OrderStatus, Side


class IBKRAdapter(BrokerAdapter):
    """IBKR adapter backed by ib_insync."""

    def __init__(self) -> None:
        """Initialize the adapter."""

        self._ib = None
        self._connected = False

    async def connect(self, credentials: dict) -> bool:
        """Connect to IB Gateway or TWS."""

        from ib_insync import IB

        host = credentials.get("host", "127.0.0.1")
        port = int(credentials.get("port", 7497))
        client_id = int(credentials.get("client_id", 1))
        self._ib = IB()
        try:
            await asyncio.to_thread(self._ib.connect, host, port, clientId=client_id)
            self._connected = self._ib.isConnected()
            return self._connected
        except Exception as exc:
            self._connected = False
            msg = f"IBKR connection failed: {exc}. Is IB Gateway/TWS running on port {port}?"
            raise ConnectionError(msg) from exc

    async def disconnect(self) -> None:
        """Disconnect from IBKR."""

        if self._ib is not None and self._ib.isConnected():
            await asyncio.to_thread(self._ib.disconnect)
        self._connected = False

    async def get_recent_trades(self, since: datetime) -> list[NormalizedTrade]:
        """Return recently filled executions."""

        ib = self._require_client()
        fills = await asyncio.to_thread(ib.fills)
        normalized: list[NormalizedTrade] = []
        for fill in fills:
            fill_time = fill.time
            if fill_time.tzinfo is None:
                fill_time = fill_time.replace(tzinfo=UTC)
            fill_time = fill_time.astimezone(UTC)
            if fill_time < since.astimezone(UTC):
                continue
            realized_pnl = None
            commission_report = getattr(fill, "commissionReport", None)
            if commission_report is not None:
                raw_realized = getattr(commission_report, "realizedPNL", None)
                if raw_realized not in (None, 1.7976931348623157e308):
                    realized_pnl = float(raw_realized)
            normalized.append(
                NormalizedTrade(
                    broker="ibkr",
                    broker_trade_id=str(fill.execution.execId),
                    symbol=fill.contract.symbol,
                    side=Side.BUY if fill.execution.side == "BOT" else Side.SELL,
                    quantity=float(fill.execution.shares),
                    price=float(fill.execution.price),
                    timestamp=fill_time,
                    pnl=realized_pnl,
                    status=OrderStatus.FILLED,
                    metadata={
                        "exchange": fill.execution.exchange,
                        "commission": float(commission_report.commission) if commission_report else None,
                    },
                )
            )
        return normalized

    async def get_account(self) -> AccountSnapshot:
        """Return an account snapshot."""

        ib = self._require_client()
        summary = await asyncio.to_thread(ib.accountSummary)
        values = {
            item.tag: float(item.value)
            for item in summary
            if getattr(item, "currency", "USD") == "USD"
        }
        positions = await asyncio.to_thread(ib.positions)
        return AccountSnapshot(
            equity=values.get("NetLiquidation", 0.0),
            cash=values.get("TotalCashValue", 0.0),
            buying_power=values.get("BuyingPower", 0.0),
            daily_pnl=values.get("RealizedPnL", 0.0),
            open_positions=len(positions),
        )

    async def is_connected(self) -> bool:
        """Return connection state."""

        return bool(self._ib is not None and self._ib.isConnected())

    def _require_client(self):
        if self._ib is None:
            raise RuntimeError("IBKR client is not connected.")
        return self._ib
