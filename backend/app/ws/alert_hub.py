"""WebSocket alert hub."""

from __future__ import annotations

import asyncio
from collections.abc import Iterable

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class AlertHub:
    """Manage live alert WebSocket connections."""

    def __init__(self) -> None:
        """Initialize the connection registry."""

        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and store a WebSocket connection."""

        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""

        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        """Broadcast a JSON payload to all connected clients."""

        for websocket in await self._snapshot():
            try:
                await websocket.send_json(payload)
            except WebSocketDisconnect:
                await self.disconnect(websocket)

    async def _snapshot(self) -> Iterable[WebSocket]:
        async with self._lock:
            return list(self._connections)
