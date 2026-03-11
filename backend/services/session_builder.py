import json
import random
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models.question import Question
from schemas.session import SessionConfig


def _generate_code(length: int = 6) -> str:
    """Generate a random uppercase alphanumeric session join code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def build_session_questions(db: AsyncSession, config: SessionConfig) -> list[int]:
    """
    Select an ordered list of question IDs matching the session config.

    Strategy:
    1. Query all active questions matching topic / modality / difficulty filters.
    2. Separate into image-based and text-only pools.
    3. Sample n_image from image pool and n_text from text pool according to image_pct.
    4. Shuffle the combined list and return ordered IDs.
    """
    base_filters = [Question.is_active == True, Question.status == "active"]

    # Topic filter
    if config.topics:
        base_filters.append(Question.topic.in_(config.topics))

    # Modality filter
    if config.modalities:
        base_filters.append(Question.modality.in_(config.modalities))

    # Difficulty filter
    if config.difficulty:
        base_filters.append(Question.difficulty == config.difficulty)

    # Fetch all matching questions
    result = await db.execute(select(Question).where(and_(*base_filters)))
    all_questions = result.scalars().all()

    if not all_questions:
        return []

    image_pool = [q for q in all_questions if q.is_image_based]
    text_pool = [q for q in all_questions if not q.is_image_based]

    n_total = min(config.n_questions, len(all_questions))
    n_image = round(n_total * config.image_pct / 100)
    n_text = n_total - n_image

    # Adjust if pools are smaller than requested
    n_image = min(n_image, len(image_pool))
    n_text = min(n_text, len(text_pool))

    # If we couldn't fill image quota, pull more from text, and vice versa
    remaining_needed = n_total - n_image - n_text
    if remaining_needed > 0:
        if len(text_pool) > n_text:
            extra = min(remaining_needed, len(text_pool) - n_text)
            n_text += extra
            remaining_needed -= extra
        if remaining_needed > 0 and len(image_pool) > n_image:
            extra = min(remaining_needed, len(image_pool) - n_image)
            n_image += extra

    selected_image = random.sample(image_pool, n_image) if n_image > 0 else []
    selected_text = random.sample(text_pool, n_text) if n_text > 0 else []

    combined = selected_image + selected_text
    random.shuffle(combined)
    return [q.id for q in combined]


async def get_unique_session_code(db: AsyncSession) -> str:
    """Generate a session code guaranteed to be unique in the DB."""
    from models.session import Session
    for _ in range(10):
        code = _generate_code(6)
        existing = await db.execute(select(Session).where(Session.code == code))
        if not existing.scalar_one_or_none():
            return code
    # Fallback to 8 chars if collision
    return _generate_code(8)
