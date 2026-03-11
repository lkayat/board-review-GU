from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.session import Session
from models.answer_aggregate import AnswerAggregate
from schemas.answer import AnswerSubmit, AggregateOut, ChoiceCount
from services.websocket_manager import manager

router = APIRouter(prefix="/api/answers", tags=["answers"])


@router.post("", status_code=204)
async def submit_answer(payload: AnswerSubmit, db: AsyncSession = Depends(get_db)):
    # Find session by code
    s_result = await db.execute(select(Session).where(Session.code == payload.session_code.upper()))
    session = s_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not accepting answers")

    choice = payload.choice.upper()
    if choice not in ("A", "B", "C", "D"):
        raise HTTPException(status_code=422, detail="Choice must be A, B, C, or D")

    # Find or create aggregate
    agg_result = await db.execute(
        select(AnswerAggregate).where(
            AnswerAggregate.session_id == session.id,
            AnswerAggregate.question_index == payload.question_index,
        )
    )
    agg = agg_result.scalar_one_or_none()
    if not agg:
        raise HTTPException(status_code=400, detail="Invalid question index for this session")

    # Increment count
    setattr(agg, f"count_{choice.lower()}", getattr(agg, f"count_{choice.lower()}") + 1)
    agg.total_responses += 1
    await db.commit()
    await db.refresh(agg)

    # Broadcast aggregate update to professor
    total = agg.total_responses or 1
    choices = [
        ChoiceCount(choice="A", count=agg.count_a, pct=round(agg.count_a / total * 100, 1)),
        ChoiceCount(choice="B", count=agg.count_b, pct=round(agg.count_b / total * 100, 1)),
        ChoiceCount(choice="C", count=agg.count_c, pct=round(agg.count_c / total * 100, 1)),
        ChoiceCount(choice="D", count=agg.count_d, pct=round(agg.count_d / total * 100, 1)),
    ]
    agg_out = AggregateOut(
        session_id=agg.session_id,
        question_id=agg.question_id,
        question_index=agg.question_index,
        count_a=agg.count_a,
        count_b=agg.count_b,
        count_c=agg.count_c,
        count_d=agg.count_d,
        total_responses=agg.total_responses,
        choices=choices,
    )
    await manager.send_to_professor(session.code, {
        "event": "aggregate_update",
        "data": agg_out.model_dump(),
    })
