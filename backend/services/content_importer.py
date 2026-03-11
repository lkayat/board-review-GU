import json
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.question import Question
import logging

logger = logging.getLogger(__name__)


async def seed_from_json(db: AsyncSession, path: str = "data/seed_questions.json") -> int:
    """Load questions from JSON seed file if the database is empty."""
    count_result = await db.execute(select(func.count()).select_from(Question))
    count = count_result.scalar()
    if count and count > 0:
        logger.info(f"Database already has {count} questions — skipping seed.")
        return 0

    if not os.path.exists(path):
        logger.warning(f"Seed file not found at {path}")
        return 0

    with open(path, encoding="utf-8") as f:
        questions_data = json.load(f)

    inserted = 0
    for q in questions_data:
        question = Question(
            source=q.get("source", "local"),
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"].upper(),
            explanation=q.get("explanation"),
            reference=q.get("reference"),
            image_url=q.get("image_url"),
            image_frames=json.dumps(q["image_frames"]) if isinstance(q.get("image_frames"), list) else q.get("image_frames"),
            image_type=q.get("image_type"),
            is_image_based=q.get("is_image_based", False),
            topic=q["topic"],
            subtopic=q.get("subtopic"),
            modality=q.get("modality"),
            difficulty=q.get("difficulty"),
            tags=json.dumps(q["tags"]) if isinstance(q.get("tags"), list) else q.get("tags"),
            is_active=True,
            status="active",
        )
        db.add(question)
        inserted += 1

    await db.commit()
    logger.info(f"Seeded {inserted} questions from {path}")
    return inserted


async def import_from_json_data(db: AsyncSession, questions_data: list) -> int:
    """Bulk import questions from a JSON payload (professor upload)."""
    inserted = 0
    for q in questions_data:
        # Check for duplicate external_id if provided
        if q.get("external_id"):
            existing = await db.execute(
                select(Question).where(Question.external_id == q["external_id"])
            )
            if existing.scalar_one_or_none():
                continue  # skip duplicate

        question = Question(
            source=q.get("source", "local"),
            external_id=q.get("external_id"),
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"].upper(),
            explanation=q.get("explanation"),
            reference=q.get("reference"),
            image_url=q.get("image_url"),
            image_frames=json.dumps(q["image_frames"]) if isinstance(q.get("image_frames"), list) else q.get("image_frames"),
            image_type=q.get("image_type"),
            is_image_based=q.get("is_image_based", False),
            topic=q["topic"],
            subtopic=q.get("subtopic"),
            modality=q.get("modality"),
            difficulty=q.get("difficulty"),
            tags=json.dumps(q["tags"]) if isinstance(q.get("tags"), list) else q.get("tags"),
            is_active=q.get("is_active", True),
            status=q.get("status", "active"),
        )
        db.add(question)
        inserted += 1

    await db.commit()
    return inserted
