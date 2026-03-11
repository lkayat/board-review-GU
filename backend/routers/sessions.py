import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from database import get_db
from models.session import Session
from models.question import Question
from models.answer_aggregate import AnswerAggregate
from schemas.session import SessionConfigIn, SessionOut
from schemas.question import QuestionOut
from schemas.answer import AggregateOut, ChoiceCount, SummaryOut, TopicSummary, QuestionReview
from services.session_builder import build_session_questions, get_unique_session_code
from services.websocket_manager import manager

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _agg_to_out(agg: AnswerAggregate) -> AggregateOut:
    total = agg.total_responses or 1  # avoid div by zero
    choices = [
        ChoiceCount(choice="A", count=agg.count_a, pct=round(agg.count_a / total * 100, 1)),
        ChoiceCount(choice="B", count=agg.count_b, pct=round(agg.count_b / total * 100, 1)),
        ChoiceCount(choice="C", count=agg.count_c, pct=round(agg.count_c / total * 100, 1)),
        ChoiceCount(choice="D", count=agg.count_d, pct=round(agg.count_d / total * 100, 1)),
    ]
    return AggregateOut(
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


async def _get_session_or_404(session_id: int, db: AsyncSession) -> Session:
    result = await db.execute(select(Session).where(Session.id == session_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


async def _broadcast_question_changed(session: Session, db: AsyncSession):
    """Broadcast the current question state to all WS connections."""
    question_ids = json.loads(session.question_ids or "[]")
    if not question_ids or session.current_index >= len(question_ids):
        return
    qid = question_ids[session.current_index]
    q_result = await db.execute(select(Question).where(Question.id == qid))
    q = q_result.scalar_one_or_none()
    if not q:
        return
    # Send public view to residents (no correct_answer)
    resident_q = {
        "id": q.id, "question_text": q.question_text,
        "option_a": q.option_a, "option_b": q.option_b,
        "option_c": q.option_c, "option_d": q.option_d,
        "is_image_based": q.is_image_based, "image_url": q.image_url,
        "image_type": q.image_type, "topic": q.topic,
    }
    await manager.broadcast_all(session.code, {
        "event": "question_changed",
        "data": {
            "index": session.current_index,
            "total": len(question_ids),
            "question": resident_q,
            "is_revealed": False,
        },
    })


# --- Routes ---

@router.post("", response_model=SessionOut, status_code=201)
async def create_session(payload: SessionConfigIn, db: AsyncSession = Depends(get_db)):
    question_ids = await build_session_questions(db, payload.config)
    if not question_ids:
        raise HTTPException(status_code=422, detail="No questions found matching the selected criteria.")

    code = await get_unique_session_code(db)
    session = Session(
        code=code,
        name=payload.name,
        status="building",
        config=payload.config.model_dump_json(),
        question_ids=json.dumps(question_ids),
        current_index=0,
        is_revealed=False,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Pre-create AnswerAggregate rows for each question
    for idx, qid in enumerate(question_ids):
        agg = AnswerAggregate(
            session_id=session.id,
            question_id=qid,
            question_index=idx,
        )
        db.add(agg)
    await db.commit()

    return session


@router.get("", response_model=List[SessionOut])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.created_at.desc()).limit(50))
    return result.scalars().all()


@router.get("/join/{code}")
async def join_session_by_code(code: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint for residents to fetch current session state."""
    result = await db.execute(select(Session).where(Session.code == code.upper()))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Check the code and try again.")
    if session.status == "completed":
        raise HTTPException(status_code=410, detail="This session has ended.")

    question_ids = json.loads(session.question_ids or "[]")
    total = len(question_ids)

    current_q = None
    if question_ids and session.current_index < total and session.status == "active":
        qid = question_ids[session.current_index]
        q_result = await db.execute(select(Question).where(Question.id == qid))
        q = q_result.scalar_one_or_none()
        if q:
            current_q = {
                "id": q.id,
                "question_text": q.question_text if session.is_revealed or session.status == "active" else "Waiting...",
                "option_a": q.option_a, "option_b": q.option_b,
                "option_c": q.option_c, "option_d": q.option_d,
                "is_image_based": q.is_image_based,
                "image_url": q.image_url,
                "image_type": q.image_type,
                "topic": q.topic,
                # Only reveal correct answer after reveal
                "correct_answer": q.correct_answer if session.is_revealed else None,
                "explanation": q.explanation if session.is_revealed else None,
            }

    return {
        "code": session.code,
        "name": session.name,
        "status": session.status,
        "current_index": session.current_index,
        "total_questions": total,
        "is_revealed": session.is_revealed,
        "current_question": current_q,
        "resident_count": manager.resident_count(session.code),
    }


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_session_or_404(session_id, db)


@router.patch("/{session_id}/start", response_model=SessionOut)
async def start_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await _get_session_or_404(session_id, db)
    if session.status not in ("building", "paused"):
        raise HTTPException(status_code=400, detail=f"Cannot start session in status '{session.status}'")
    session.status = "active"
    session.started_at = datetime.utcnow()
    session.is_revealed = False
    await db.commit()
    await db.refresh(session)
    await manager.broadcast_all(session.code, {"event": "session_started", "data": {"code": session.code}})
    await _broadcast_question_changed(session, db)
    return session


@router.patch("/{session_id}/advance", response_model=SessionOut)
async def advance_session(
    session_id: int,
    direction: str = Body("next", embed=True),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, db)
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    question_ids = json.loads(session.question_ids or "[]")
    total = len(question_ids)

    if direction == "next":
        if session.current_index >= total - 1:
            raise HTTPException(status_code=400, detail="Already at last question")
        session.current_index += 1
    elif direction == "prev":
        if session.current_index <= 0:
            raise HTTPException(status_code=400, detail="Already at first question")
        session.current_index -= 1
    else:
        raise HTTPException(status_code=400, detail="direction must be 'next' or 'prev'")

    session.is_revealed = False
    await db.commit()
    await db.refresh(session)
    await _broadcast_question_changed(session, db)
    return session


@router.patch("/{session_id}/reveal", response_model=SessionOut)
async def reveal_answer(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await _get_session_or_404(session_id, db)
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    session.is_revealed = True
    await db.commit()
    await db.refresh(session)

    # Fetch current question
    question_ids = json.loads(session.question_ids or "[]")
    qid = question_ids[session.current_index] if question_ids else None
    q_result = await db.execute(select(Question).where(Question.id == qid)) if qid else None
    q = q_result.scalar_one_or_none() if q_result else None

    # Fetch aggregate
    agg_result = await db.execute(
        select(AnswerAggregate).where(
            AnswerAggregate.session_id == session.id,
            AnswerAggregate.question_index == session.current_index,
        )
    )
    agg = agg_result.scalar_one_or_none()

    await manager.broadcast_all(session.code, {
        "event": "answer_revealed",
        "data": {
            "correct": q.correct_answer if q else None,
            "explanation": q.explanation if q else None,
            "reference": q.reference if q else None,
            "aggregate": _agg_to_out(agg).model_dump() if agg else None,
        },
    })
    return session


@router.patch("/{session_id}/complete", response_model=SessionOut)
async def complete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await _get_session_or_404(session_id, db)
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    await manager.broadcast_all(session.code, {
        "event": "session_ended",
        "data": {"summary_url": f"/session/{session.id}/summary"},
    })
    return session


@router.get("/{session_id}/summary", response_model=SummaryOut)
async def session_summary(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await _get_session_or_404(session_id, db)
    question_ids = json.loads(session.question_ids or "[]")

    # Fetch all questions
    questions_map: dict[int, Question] = {}
    for qid in question_ids:
        r = await db.execute(select(Question).where(Question.id == qid))
        q = r.scalar_one_or_none()
        if q:
            questions_map[qid] = q

    # Fetch all aggregates
    agg_result = await db.execute(
        select(AnswerAggregate).where(AnswerAggregate.session_id == session_id)
    )
    aggs = {a.question_index: a for a in agg_result.scalars().all()}

    # Compute per-question and per-topic stats
    topic_data: dict[str, dict] = {}
    question_reviews = []
    total_correct_weighted = 0.0
    total_q = len(question_ids)

    for idx, qid in enumerate(question_ids):
        q = questions_map.get(qid)
        if not q:
            continue
        agg = aggs.get(idx)
        pct_correct = 0.0
        if agg and agg.total_responses > 0:
            correct_count = getattr(agg, f"count_{q.correct_answer.lower()}", 0)
            pct_correct = round(correct_count / agg.total_responses * 100, 1)
            total_correct_weighted += pct_correct

        question_reviews.append(QuestionReview(
            question_index=idx,
            question_text=q.question_text,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            aggregate=_agg_to_out(agg) if agg else None,
            resident_pct_correct=pct_correct,
        ))

        t = q.topic
        if t not in topic_data:
            topic_data[t] = {"total": 0, "sum_pct": 0.0}
        topic_data[t]["total"] += 1
        topic_data[t]["sum_pct"] += pct_correct

    overall_pct = round(total_correct_weighted / total_q, 1) if total_q > 0 else 0.0

    # Build taxonomy labels
    try:
        import json as _json
        with open("data/gu_taxonomy.json", encoding="utf-8") as f:
            taxonomy = _json.load(f)
        labels = {t["code"]: t["label"] for t in taxonomy["topics"]}
    except Exception:
        labels = {}

    topics = [
        TopicSummary(
            topic=code,
            label=labels.get(code, code),
            total_questions=data["total"],
            correct_count=round(data["sum_pct"] / 100 * data["total"]),
            pct_correct=round(data["sum_pct"] / data["total"], 1) if data["total"] > 0 else 0.0,
        )
        for code, data in topic_data.items()
    ]

    return SummaryOut(
        session_id=session_id,
        session_name=session.name,
        total_questions=total_q,
        overall_pct_correct=overall_pct,
        topics=topics,
        questions=question_reviews,
    )
