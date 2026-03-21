"""Alpaca adapter tests."""

from app.brokers.alpaca import AlpacaAdapter


def test_adapter_initial_connection_state() -> None:
    """The adapter should start disconnected."""

    adapter = AlpacaAdapter()
    assert adapter._client is None
