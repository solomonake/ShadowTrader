"""Broker adapter registry."""

from app.brokers.alpaca import AlpacaAdapter
from app.brokers.base import BrokerAdapter
from app.brokers.binance_adapter import BinanceAdapter
from app.brokers.ibkr import IBKRAdapter


def get_broker_adapter(broker: str) -> BrokerAdapter:
    """Return a broker adapter for the requested broker."""

    normalized = broker.lower()
    if normalized == "alpaca":
        return AlpacaAdapter(paper=True)
    if normalized == "ibkr":
        return IBKRAdapter()
    if normalized == "binance":
        return BinanceAdapter()
    raise ValueError(f"Unknown broker: {broker}")
