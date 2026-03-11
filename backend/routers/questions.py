import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from pydantic import BaseModel

from database import get_db
from models.question import Question
from schemas.question import QuestionOut, QuestionCreate, QuestionUpdate, QuestionStatsOut, TopicStat
from config import settings

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


@router.get("/pending", response_model=List[QuestionOut])
async def list_pending(db: AsyncSession = Depends(get_db)):
    """List all questions awaiting professor review."""
    result = await db.execute(
        select(Question).where(Question.status == "pending_review").order_by(Question.created_at.desc())
    )
    return result.scalars().all()


@router.get("/pending-count")
async def pending_count(db: AsyncSession = Depends(get_db)):
    """Returns count of questions awaiting professor review."""
    result = await db.execute(
        select(func.count()).select_from(Question).where(Question.status == "pending_review")
    )
    return {"count": result.scalar() or 0}


@router.get("/all", response_model=List[QuestionOut])
async def list_all_questions(
    status: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    modality: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(200, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """List ALL questions regardless of status. Used by the Question Bank UI."""
    filters = []
    if status:
        filters.append(Question.status == status)
    if topic:
        filters.append(Question.topic == topic)
    if modality:
        filters.append(Question.modality == modality)
    if difficulty:
        filters.append(Question.difficulty == difficulty)
    if search:
        filters.append(Question.question_text.ilike(f"%{search}%"))

    query = select(Question)
    if filters:
        query = query.where(and_(*filters))
    query = query.order_by(Question.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


class GenerateRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"
    count: int = 5
    subtopic: Optional[str] = None
    modality: Optional[str] = None
    keywords: Optional[str] = None


@router.post("/generate", response_model=List[QuestionOut], status_code=201)
async def generate_questions(payload: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """Use Claude AI to generate board review questions and insert them as pending_review."""
    from services.ai_generator import generate_questions_with_ai

    valid_topics = {"kidney", "bladder", "prostate", "adrenal", "ureter", "urethra", "scrotum", "female_gu", "retroperitoneum"}
    if payload.topic not in valid_topics:
        raise HTTPException(status_code=422, detail=f"Invalid topic. Must be one of: {', '.join(sorted(valid_topics))}")
    if payload.count < 1 or payload.count > 10:
        raise HTTPException(status_code=422, detail="count must be between 1 and 10")

    try:
        raw_questions = await generate_questions_with_ai(
            topic=payload.topic,
            difficulty=payload.difficulty,
            count=payload.count,
            subtopic=payload.subtopic,
            modality=payload.modality,
            keywords=payload.keywords,
            api_key=settings.anthropic_api_key or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

    inserted = []
    for q_data in raw_questions:
        q = Question(
            source=q_data.get("source", "ai_generated"),
            question_text=q_data.get("question_text", ""),
            option_a=q_data.get("option_a", ""),
            option_b=q_data.get("option_b", ""),
            option_c=q_data.get("option_c", ""),
            option_d=q_data.get("option_d", ""),
            correct_answer=q_data.get("correct_answer", "A"),
            explanation=q_data.get("explanation", ""),
            reference=q_data.get("reference"),
            image_url=q_data.get("image_url"),
            image_frames=json.dumps(q_data["image_frames"]) if q_data.get("image_frames") else None,
            image_type=q_data.get("image_type"),
            is_image_based=False,
            topic=q_data.get("topic", payload.topic),
            subtopic=q_data.get("subtopic"),
            modality=q_data.get("modality"),
            difficulty=q_data.get("difficulty", payload.difficulty),
            tags=json.dumps(q_data.get("tags", [])),
            status="pending_review",
            is_active=False,
        )
        db.add(q)
        inserted.append(q)

    await db.commit()
    for q in inserted:
        await db.refresh(q)

    return inserted


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
    q.status = "pending_review"
    q.is_active = False
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


@router.patch("/{question_id}/deactivate", response_model=QuestionOut)
async def deactivate_question(question_id: int, db: AsyncSession = Depends(get_db)):
    """Send a question back to draft (soft-deactivate without deleting)."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = "draft"
    q.is_active = False
    await db.commit()
    await db.refresh(q)
    return q


@router.patch("/{question_id}/submit-review", response_model=QuestionOut)
async def submit_for_review(question_id: int, db: AsyncSession = Depends(get_db)):
    """Move a draft question to pending_review."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = "pending_review"
    q.is_active = False
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
