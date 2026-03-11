import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List

from database import get_db
from models.question import Question
from schemas.question import QuestionOut, QuestionCreate, QuestionUpdate, QuestionStatsOut, TopicStat

router = APIRouter(prefix="/api/questions", tags=["questions"])


def _build_filters(
    topic: Optional[str],
    modality: Optional[str],
    difficulty: Optional[str],
    source: Optional[str],
    is_image_based: Optional[bool],
    status: str = "active",
):
    filters = [Question.is_active == True, Question.status == status]
    if topic:
        filters.append(Question.topic == topic)
    if modality:
        filters.append(Question.modality == modality)
    if difficulty:
        filters.append(Question.difficulty == difficulty)
    if source:
        filters.append(Question.source == source)
    if is_image_based is not None:
        filters.append(Question.is_image_based == is_image_based)
    return filters


@router.get("", response_model=List[QuestionOut])
async def list_questions(
    topic: Optional[str] = Query(None),
    modality: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    is_image_based: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    filters = _build_filters(topic, modality, difficulty, source, is_image_based)
    result = await db.execute(
        select(Question).where(and_(*filters)).offset(offset).limit(limit)
    )
    return result.scalars().all()


@router.get("/stats", response_model=QuestionStatsOut)
async def question_stats(db: AsyncSession = Depends(get_db)):
    """Returns available question counts per topic for the session builder UI."""
    # Load taxonomy labels
    try:
        with open("data/gu_taxonomy.json", encoding="utf-8") as f:
            taxonomy = json.load(f)
        topic_labels = {t["code"]: t["label"] for t in taxonomy["topics"]}
    except Exception:
        topic_labels = {}

    total_result = await db.execute(
        select(func.count()).select_from(Question).where(
            Question.is_active == True, Question.status == "active"
        )
    )
    total = total_result.scalar() or 0

    # Per-topic stats
    topics_result = await db.execute(
        select(Question.topic).where(
            Question.is_active == True, Question.status == "active"
        ).distinct()
    )
    topic_codes = [r[0] for r in topics_result.fetchall()]

    topic_stats = []
    for code in sorted(topic_codes):
        base_filter = [Question.is_active == True, Question.status == "active", Question.topic == code]

        total_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter)))
        image_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter, Question.is_image_based == True)))
        text_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter, Question.is_image_based == False)))
        basic_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter, Question.difficulty == "basic")))
        inter_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter, Question.difficulty == "intermediate")))
        adv_r = await db.execute(select(func.count()).select_from(Question).where(and_(*base_filter, Question.difficulty == "advanced")))

        topic_stats.append(TopicStat(
            topic=code,
            label=topic_labels.get(code, code),
            total=total_r.scalar() or 0,
            image_based=image_r.scalar() or 0,
            text_only=text_r.scalar() or 0,
            basic=basic_r.scalar() or 0,
            intermediate=inter_r.scalar() or 0,
            advanced=adv_r.scalar() or 0,
        ))

    return QuestionStatsOut(total=total, topics=topic_stats)


@router.get("/drafts", response_model=List[QuestionOut])
async def list_drafts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Question).where(Question.status == "draft").order_by(Question.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{question_id}", response_model=QuestionOut)
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.post("", response_model=QuestionOut, status_code=201)
async def create_question(payload: QuestionCreate, db: AsyncSession = Depends(get_db)):
    q = Question(**payload.model_dump())
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


@router.patch("/{question_id}", response_model=QuestionOut)
async def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(q, field, value)
    await db.commit()
    await db.refresh(q)
    return q


@router.patch("/{question_id}/activate", response_model=QuestionOut)
async def activate_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = "active"
    q.is_active = True
    await db.commit()
    await db.refresh(q)
    return q


@router.delete("/{question_id}", status_code=204)
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(q)
    await db.commit()
