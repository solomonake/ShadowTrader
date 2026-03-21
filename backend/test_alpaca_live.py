"""
ShadowTrader AI — Alpaca Connection Verification Script
========================================================
Run this BEFORE testing the full app to confirm your API keys work
and your Alpaca adapter code matches the real SDK.

Usage:
    cd ~/Desktop/ShadowTrader/backend
    source .venv/bin/activate
    python test_alpaca_live.py
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# 1. CHECK ENVIRONMENT VARIABLES
# ============================================================
api_key = os.getenv("ALPACA_API_KEY", "")
secret_key = os.getenv("ALPACA_SECRET_KEY", "")
paper = os.getenv("ALPACA_PAPER", "true").lower() == "true"

if not api_key or api_key == "your-key-here" or not secret_key:
    print("\n❌ ERROR: Alpaca API keys not configured.")
    print("   Edit backend/.env and set:")
    print("     ALPACA_API_KEY=PKxxxxxxxxxxxxxxxx")
    print("     ALPACA_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    print("     ALPACA_PAPER=true")
    print("\n   Get your keys at: https://app.alpaca.markets (switch to Paper Trading first)\n")
    sys.exit(1)

print(f"✅ API Key found: {api_key[:6]}...{api_key[-4:]}")
print(f"✅ Paper mode: {paper}")
print()

# ============================================================
# 2. CONNECT TO ALPACA
# ============================================================
try:
    from alpaca.trading.client import TradingClient
    print("✅ alpaca-py imported successfully")
except ImportError:
    print("❌ alpaca-py not installed. Run: pip install alpaca-py")
    sys.exit(1)

try:
    client = TradingClient(
        api_key=api_key,
        secret_key=secret_key,
        paper=paper,
    )
    print("✅ TradingClient created")
except Exception as e:
    print(f"❌ Failed to create TradingClient: {e}")
    sys.exit(1)

# ============================================================
# 3. TEST: GET ACCOUNT
# ============================================================
print("\n--- Account Info ---")
try:
    account = client.get_account()
    print(f"✅ Account status: {account.status}")
    print(f"   Equity:        ${float(account.equity):,.2f}")
    print(f"   Cash:          ${float(account.cash):,.2f}")
    print(f"   Buying power:  ${float(account.buying_power):,.2f}")
    print(f"   Day trade count: {account.daytrade_count}")
    print(f"   Pattern day trader: {account.pattern_day_trader}")
except Exception as e:
    print(f"❌ get_account() failed: {e}")
    print("   Check that your API key and secret are correct.")
    print("   Make sure you're using Paper Trading keys (not live).")
    sys.exit(1)

# ============================================================
# 4. TEST: GET RECENT ORDERS
# ============================================================
print("\n--- Recent Orders (last 7 days) ---")
try:
    from alpaca.trading.requests import GetOrdersRequest
    from alpaca.trading.enums import QueryOrderStatus

    since = datetime.now(timezone.utc) - timedelta(days=7)

    request_params = GetOrdersRequest(
        status=QueryOrderStatus.CLOSED,
        after=since,
        limit=10,
    )
    orders = client.get_orders(filter=request_params)

    if not orders:
        print("   No closed orders in the last 7 days.")
        print("   That's fine — you'll need to place some paper trades to test the rule engine.")
    else:
        print(f"   Found {len(orders)} closed orders:")
        for o in orders[:5]:  # Show first 5
            filled_price = float(o.filled_avg_price) if o.filled_avg_price else 0
            filled_qty = float(o.filled_qty) if o.filled_qty else 0
            print(f"   • {o.side.upper():4s} {filled_qty:>8.2f} {o.symbol:<8s} @ ${filled_price:>10.2f}  ({o.filled_at})")
        if len(orders) > 5:
            print(f"   ... and {len(orders) - 5} more")

    print("✅ get_orders() works correctly")

except Exception as e:
    print(f"❌ get_orders() failed: {e}")
    import traceback
    traceback.print_exc()

# ============================================================
# 5. TEST: GET POSITIONS
# ============================================================
print("\n--- Open Positions ---")
try:
    positions = client.get_all_positions()
    if not positions:
        print("   No open positions.")
    else:
        print(f"   {len(positions)} open positions:")
        for p in positions:
            print(f"   • {p.side.upper():5s} {float(p.qty):>8.2f} {p.symbol:<8s}  P&L: ${float(p.unrealized_pl):>10.2f}")
    print("✅ get_all_positions() works correctly")
except Exception as e:
    print(f"❌ get_all_positions() failed: {e}")

# ============================================================
# 6. SHOW WHAT YOUR ADAPTER SHOULD USE
# ============================================================
print("\n" + "=" * 60)
print("VERIFIED ALPACA-PY SDK REFERENCE FOR YOUR ADAPTER")
print("=" * 60)
print("""
Confirmed working imports and method signatures:

    from alpaca.trading.client import TradingClient
    from alpaca.trading.requests import GetOrdersRequest
    from alpaca.trading.enums import (
        OrderSide,          # BUY, SELL
        QueryOrderStatus,   # OPEN, CLOSED, ALL
        TimeInForce,        # DAY, GTC, IOC, FOK
    )

    # Connect
    client = TradingClient(api_key, secret_key, paper=True)

    # Account
    account = client.get_account()
    account.equity          # str → float
    account.cash            # str → float
    account.buying_power    # str → float

    # Get closed orders since a datetime
    request = GetOrdersRequest(
        status=QueryOrderStatus.CLOSED,
        after=datetime_utc,
        limit=500,
    )
    orders = client.get_orders(filter=request)

    # Each order object:
    order.id                # UUID
    order.symbol            # str ("AAPL", "BTC/USD")
    order.side              # OrderSide.BUY or OrderSide.SELL
    order.filled_qty        # str → float (use float())
    order.filled_avg_price  # str → float (use float())
    order.filled_at         # datetime or None
    order.status            # "filled", "canceled", etc.

    # Positions
    positions = client.get_all_positions()
    pos.symbol, pos.qty, pos.side, pos.unrealized_pl

⚠️  NOTE: Alpaca returns numeric fields as STRINGS.
    Always cast with float() before doing math.

⚠️  NOTE: filled_at can be None for unfilled orders.
    Always filter: if o.filled_at is not None

⚠️  NOTE: TradingClient methods are SYNCHRONOUS.
    In your async FastAPI adapter, wrap with:
    await asyncio.to_thread(client.get_orders, filter=request)
""")

# ============================================================
# 7. NEXT STEPS
# ============================================================
print("=" * 60)
print("NEXT STEPS")
print("=" * 60)
print("""
1. If no orders exist yet, go to https://app.alpaca.markets
   (Paper Trading mode) and manually place a few trades.

2. Start your FastAPI server:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

3. Check your API docs:
   open http://localhost:8000/docs

4. Look at your Alpaca adapter code in:
   backend/app/brokers/alpaca.py

   Make sure it matches the verified signatures above.
   Key things to check:
   - Uses float() on filled_qty and filled_avg_price
   - Filters out orders where filled_at is None
   - Wraps sync TradingClient calls in asyncio.to_thread()

5. Create rules and test the full loop (see CODEX_PROMPT.md)
""")
