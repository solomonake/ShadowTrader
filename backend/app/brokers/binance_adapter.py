"""Binance adapter."""

from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from datetime import UTC, datetime

from app.brokers.base import AccountSnapshot, BrokerAdapter, NormalizedTrade, OrderStatus, Side


class BinanceAdapter(BrokerAdapter):
    """Binance adapter with basic testnet support."""

    def __init__(self) -> None:
        """Initialize the adapter."""

        self.client = None
        self._is_paper = True
        self._pnl_state: dict[str, deque[tuple[float, float]]] = defaultdict(deque)

    async def connect(self, credentials: dict) -> bool:
        """Connect to Binance."""

        from binance.client import Client as BinanceClient
        from binance.exceptions import BinanceAPIException

        api_key = credentials["api_key"]
        secret_key = credentials["secret_key"]
        self._is_paper = bool(credentials.get("testnet", True))
        try:
            self.client = await asyncio.to_thread(
                BinanceClient,
                api_key,
                secret_key,
                testnet=self._is_paper,
            )
            account = await asyncio.to_thread(self.client.get_account)
            return bool(account.get("canTrade", True))
        except BinanceAPIException as exc:
            raise ConnectionError(f"Binance connection failed: {exc.message}") from exc
        except Exception as exc:
            raise ConnectionError(f"Binance connection failed: {exc}") from exc

    async def disconnect(self) -> None:
        """Disconnect from Binance."""

        self.client = None

    async def get_recent_trades(self, since: datetime) -> list[NormalizedTrade]:
        """Return recent filled Binance orders."""

        client = self._require_client()
        symbols = await self._discover_symbols()
        normalized: list[NormalizedTrade] = []
        since_ms = int(since.astimezone(UTC).timestamp() * 1000)

        for symbol in symbols:
            orders = await asyncio.to_thread(client.get_all_orders, symbol=symbol, startTime=since_ms, limit=200)
            await asyncio.sleep(0.05)
            for order in orders:
                if order.get("status") != "FILLED":
                    continue
                fill_time = datetime.fromtimestamp(order["updateTime"] / 1000, tz=UTC)
                quantity = float(order["executedQty"])
                quote_qty = float(order.get("cummulativeQuoteQty", 0))
                price = (quote_qty / quantity) if quantity else 0.0
                side = Side.BUY if order["side"] == "BUY" else Side.SELL
                pnl = self._compute_realized_pnl(symbol, side, quantity, price)
                normalized.append(
                    NormalizedTrade(
                        broker="binance",
                        broker_trade_id=f"{symbol}-{order['orderId']}",
                        symbol=symbol,
                        side=side,
                        quantity=quantity,
                        price=price,
                        timestamp=fill_time,
                        pnl=pnl,
                        status=OrderStatus.FILLED,
                        metadata={
                            "order_type": order.get("type"),
                            "time_in_force": order.get("timeInForce"),
                            "testnet": self._is_paper,
                        },
                    )
                )
        return normalized

    async def get_account(self) -> AccountSnapshot:
        """Return a simplified account snapshot."""

        client = self._require_client()
        account = await asyncio.to_thread(client.get_account)
        balances = {
            item["asset"]: float(item["free"]) + float(item["locked"])
            for item in account["balances"]
            if float(item["free"]) + float(item["locked"]) > 0
        }
        stable_value = balances.get("USDT", 0.0) + balances.get("BUSD", 0.0)
        return AccountSnapshot(
            equity=stable_value,
            cash=stable_value,
            buying_power=stable_value,
            daily_pnl=0.0,
            open_positions=len([asset for asset in balances if asset not in {"USDT", "BUSD", "BNB"}]),
        )

    async def is_connected(self) -> bool:
        """Return connection state."""

        if self.client is None:
            return False
        try:
            await asyncio.to_thread(self.client.get_account)
            return True
        except Exception:
            return False

    async def _discover_symbols(self) -> list[str]:
        """Discover active symbols while respecting rate limits."""

        client = self._require_client()
        account = await asyncio.to_thread(client.get_account)
        candidate_assets = [
            item["asset"]
            for item in account["balances"]
            if (float(item["free"]) + float(item["locked"]) > 0) and item["asset"] not in {"USDT", "BUSD", "BNB"}
        ]
        symbols = [f"{asset}USDT" for asset in candidate_assets]
        return symbols or ["BTCUSDT", "ETHUSDT"]

    def _compute_realized_pnl(self, symbol: str, side: Side, quantity: float, price: float) -> float | None:
        """Approximate realized P&L using FIFO lots."""

        inventory = self._pnl_state[symbol]
        if side is Side.BUY:
            inventory.append((quantity, price))
            return None

        remaining = quantity
        realized = 0.0
        while remaining > 0 and inventory:
            entry_qty, entry_price = inventory[0]
            matched = min(remaining, entry_qty)
            realized += (price - entry_price) * matched
            remaining -= matched
            entry_qty -= matched
            if entry_qty <= 0:
                inventory.popleft()
            else:
                inventory[0] = (entry_qty, entry_price)
        return round(realized, 2) if quantity > 0 else None

    def _require_client(self):
        if self.client is None:
            raise RuntimeError("Binance client is not connected.")
        return self.client
