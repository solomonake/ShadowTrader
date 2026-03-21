#!/usr/bin/env python3
"""
End-to-end test for ShadowTrader Phase 1 loop.

Run from backend/ directory with:
    python test_full_loop.py

Requires:
  - FastAPI server running:  uvicorn app.main:app --reload
  - US stock market open:    Mon–Fri, 9:30 AM – 4:00 PM ET
    (Alpaca paper DAY orders only fill during market hours)
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
import os

# Ensure app package is importable from backend/
sys.path.insert(0, os.path.dirname(__file__))

import httpx
import websockets
from alpaca.trading.client import TradingClient
from alpaca.trading.enums import OrderSide, QueryOrderStatus, TimeInForce
from alpaca.trading.requests import GetOrdersRequest, MarketOrderRequest

from app.config import get_settings

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/alerts"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

alerts_received: list[dict] = []
_ws_task: asyncio.Task | None = None
_stop_ws = asyncio.Event()


async def _ws_listener() -> None:
    """Background task: connect to WS and collect all alerts."""
    try:
        async with websockets.connect(WS_URL) as ws:
            print(f"  [WS] Connected to {WS_URL}")
            while not _stop_ws.is_set():
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    alert = json.loads(raw)
                    alerts_received.append(alert)
                    print(f"  [WS] Alert: {alert.get('rule_type')} — {alert.get('message')}")
                except asyncio.TimeoutError:
                    continue
    except Exception as exc:
        print(f"  [WS] Connection error: {exc}")


def _check_server() -> bool:
    """Verify the FastAPI server is reachable."""
    try:
        resp = httpx.get(f"{BASE_URL}/health", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


async def _cancel_open_orders(client: TradingClient) -> None:
    """Cancel all open orders (cleanup, do not close positions)."""
    try:
        open_orders = await asyncio.to_thread(
            client.get_orders,
            filter=GetOrdersRequest(status=QueryOrderStatus.OPEN),
        )
        for order in open_orders:
            try:
                await asyncio.to_thread(client.cancel_order_by_id, str(order.id))
            except Exception:
                pass
        if open_orders:
            print(f"  Cancelled {len(open_orders)} open order(s).")
    except Exception as exc:
        print(f"  Warning: could not cancel open orders: {exc}")


async def _place_order(client: TradingClient, symbol: str, qty: int, n: int) -> str:
    """Submit a market buy order and return the order ID."""
    order = await asyncio.to_thread(
        client.submit_order,
        order_data=MarketOrderRequest(
            symbol=symbol,
            qty=qty,
            side=OrderSide.BUY,
            time_in_force=TimeInForce.DAY,
        ),
    )
    print(f"  Order {n} submitted: {order.id} ({symbol} x{qty})")
    return str(order.id)


async def _wait_for_violation(rule_type: str, timeout: float = 60.0) -> bool:
    """Wait up to `timeout` seconds for a WS alert matching rule_type."""
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        if any(a.get("rule_type") == rule_type for a in alerts_received):
            return True
        await asyncio.sleep(1.0)
    return False


async def main() -> int:
    """Run the end-to-end test. Returns 0 for PASS, 1 for FAIL."""

    print("=" * 60)
    print("  ShadowTrader Phase 1 — End-to-End Loop Test")
    print("=" * 60)

    # ── Step 0: check server ────────────────────────────────────
    print("\n[1/6] Checking server health...")
    if not _check_server():
        print(f"  {FAIL}: FastAPI server not reachable at {BASE_URL}")
        print("  Start it with: uvicorn app.main:app --reload")
        return 1
    print(f"  Server OK")

    # ── Step 1: load Alpaca credentials ─────────────────────────
    print("\n[2/6] Loading Alpaca credentials...")
    settings = get_settings()
    if not settings.alpaca_api_key or not settings.alpaca_secret_key:
        print(f"  {FAIL}: ALPACA_API_KEY / ALPACA_SECRET_KEY not set in .env")
        return 1
    client = TradingClient(
        api_key=settings.alpaca_api_key,
        secret_key=settings.alpaca_secret_key,
        paper=True,
    )
    account = await asyncio.to_thread(client.get_account)
    print(f"  Alpaca account: {account.account_number}, equity=${float(account.equity):,.2f}")

    # Check market is open — DAY orders only fill during regular hours
    clock = await asyncio.to_thread(client.get_clock)
    if not clock.is_open:
        next_open = clock.next_open.strftime("%A %b %d %I:%M %p ET")
        print(f"\n  SKIP: Market is currently CLOSED.")
        print(f"  Next open: {next_open}")
        print(f"  Alpaca paper DAY orders only fill during regular market hours.")
        print(f"  Re-run this test during Mon–Fri 9:30 AM – 4:00 PM ET.")
        return 0  # Not a test failure — environment not ready

    # ── Step 2: start WS listener ────────────────────────────────
    print("\n[3/6] Starting WebSocket listener...")
    global _ws_task
    _ws_task = asyncio.create_task(_ws_listener())
    await asyncio.sleep(1.5)  # let WS handshake complete

    # ── Step 3: verify max_trades_per_day rule exists ────────────
    print("\n[4/6] Verifying rules via API...")
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            f"{BASE_URL}/api/rules",
            headers={"x-user-id": TEST_USER_ID},
        )
    if resp.status_code != 200:
        print(f"  {FAIL}: GET /api/rules returned {resp.status_code}")
        return 1
    rule_list = resp.json()
    max_trades_rule = next(
        (r for r in rule_list if r["rule_type"] == "max_trades_per_day" and r["enabled"]),
        None,
    )
    if max_trades_rule is None:
        print(f"  {FAIL}: No enabled max_trades_per_day rule found for test user.")
        print("  Seed it first — see docs.")
        return 1
    limit = max_trades_rule["params"]["max"]
    print(f"  Found max_trades_per_day rule: limit={limit}")

    # ── Step 4: place limit+1 orders ─────────────────────────────
    total_orders = limit + 1
    print(f"\n[5/6] Placing {total_orders} orders (limit is {limit})...")
    order_ids: list[str] = []
    for i in range(total_orders):
        oid = await _place_order(client, "AAPL", 1, i + 1)
        order_ids.append(oid)
        if i < total_orders - 1:
            await asyncio.sleep(2)  # stagger slightly

    # ── Step 5: wait for violation alert ─────────────────────────
    print(f"\n[6/6] Waiting for max_trades_per_day violation alert (up to 90s)...")
    got_violation = await _wait_for_violation("max_trades_per_day", timeout=90.0)

    # ── Cleanup ───────────────────────────────────────────────────
    print("\nCleaning up open orders...")
    await _cancel_open_orders(client)

    # ── Result ────────────────────────────────────────────────────
    _stop_ws.set()
    if _ws_task:
        _ws_task.cancel()

    print("\n" + "=" * 60)
    print(f"  Alerts received total: {len(alerts_received)}")
    for a in alerts_received:
        print(f"    • [{a.get('severity')}] {a.get('rule_type')}: {a.get('message')}")

    if got_violation:
        print(f"\n  Result: {PASS}")
        print("  max_trades_per_day violation delivered via WebSocket.")
        return 0
    else:
        print(f"\n  Result: {FAIL}")
        print("  No max_trades_per_day alert received within the timeout.")
        print("  Check that:")
        print("    1. The server was restarted after applying these fixes")
        print("    2. The polling loop is running (check server logs)")
        print("    3. Alpaca paper orders are filling (market hours or IOC)")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
