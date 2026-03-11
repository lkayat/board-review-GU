import json
import logging
from fastapi import WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import AsyncSessionLocal
from models.session import Session
from models.question import Question
from services.websocket_manager import manager

logger = logging.getLogger(__name__)


async def session_websocket(websocket: WebSocket, session_code: str, role: str = "resident"):
    """
    WebSocket endpoint for live session participation.

    Residents receive push events and submit answers via REST.
    Professor receives aggregate updates and resident join notifications.
    """
    session_code = session_code.upper()

    if role == "professor":
        await manager.connect_professor(session_code, websocket)
    else:
        await manager.connect_resident(session_code, websocket)

    # Send current session state to newly connected resident
    if role == "resident":
        async with AsyncSessionLocal() as db:
            s_result = await db.execute(select(Session).where(Session.code == session_code))
            session = s_result.scalar_one_or_none()
            if session and session.status == "active":
                question_ids = json.loads(session.question_ids or "[]")
                if question_ids and session.current_index < len(question_ids):
                    qid = question_ids[session.current_index]
                    q_result = await db.execute(select(Question).where(Question.id == qid))
                    q = q_result.scalar_one_or_none()
                    if q:
                        await websocket.send_text(json.dumps({
                            "event": "question_changed",
                            "data": {
                                "index": session.current_index,
                                "total": len(question_ids),
                                "question": {
                                    "id": q.id,
                                    "question_text": q.question_text,
                                    "option_a": q.option_a, "option_b": q.option_b,
                                    "option_c": q.option_c, "option_d": q.option_d,
                                    "is_image_based": q.is_image_based,
                                    "image_url": q.image_url,
                                    "image_type": q.image_type,
                                    "topic": q.topic,
                                },
                                "is_revealed": session.is_revealed,
                            },
                        }))
            else:
                await websocket.send_text(json.dumps({
                    "event": "waiting",
                    "data": {"message": "Waiting for the session to start..."},
                }))

    try:
        while True:
            # Keep connection alive; professor may send pings
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("event") == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(session_code, websocket, role)
    except Exception as e:
        logger.error(f"WS error ({session_code}, {role}): {e}")
        await manager.disconnect(session_code, websocket, role)
