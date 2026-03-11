import json
import logging
from fastapi import WebSocket
from typing import Dict, List

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # One professor WS per session code
        self.professor_connections: Dict[str, WebSocket] = {}
        # Zero or more resident WS per session code
        self.resident_connections: Dict[str, List[WebSocket]] = {}

    # --- Connect / Disconnect ---

    async def connect_professor(self, session_code: str, websocket: WebSocket):
        await websocket.accept()
        self.professor_connections[session_code] = websocket
        logger.info(f"Professor connected to session {session_code}")

    async def connect_resident(self, session_code: str, websocket: WebSocket):
        await websocket.accept()
        if session_code not in self.resident_connections:
            self.resident_connections[session_code] = []
        self.resident_connections[session_code].append(websocket)
        count = len(self.resident_connections[session_code])
        logger.info(f"Resident connected to session {session_code} (total: {count})")
        # Notify professor of new count
        await self.send_to_professor(session_code, {"event": "resident_joined", "data": {"count": count}})
        return count

    async def disconnect(self, session_code: str, websocket: WebSocket, role: str):
        if role == "professor":
            self.professor_connections.pop(session_code, None)
            logger.info(f"Professor disconnected from session {session_code}")
        else:
            residents = self.resident_connections.get(session_code, [])
            if websocket in residents:
                residents.remove(websocket)
            count = len(residents)
            logger.info(f"Resident disconnected from session {session_code} (remaining: {count})")

    # --- Send methods ---

    async def send_to_professor(self, session_code: str, message: dict):
        ws = self.professor_connections.get(session_code)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send to professor ({session_code}): {e}")
                self.professor_connections.pop(session_code, None)

    async def broadcast_to_residents(self, session_code: str, message: dict):
        residents = self.resident_connections.get(session_code, [])
        disconnected = []
        for ws in residents:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send to resident ({session_code}): {e}")
                disconnected.append(ws)
        for ws in disconnected:
            residents.remove(ws)

    async def broadcast_all(self, session_code: str, message: dict):
        await self.send_to_professor(session_code, message)
        await self.broadcast_to_residents(session_code, message)

    def resident_count(self, session_code: str) -> int:
        return len(self.resident_connections.get(session_code, []))


# Global singleton — imported by routers and WS endpoint
manager = ConnectionManager()
