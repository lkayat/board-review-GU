from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .question import QuestionOut, QuestionPublicOut


class SessionConfig(BaseModel):
    topics: List[str]
    modalities: Optional[List[str]] = None
    difficulty: Optional[str] = None  # basic | intermediate | advanced | None = all
    n_questions: int = 20
    image_pct: int = 50  # 0-100 percent image-based
    timer_seconds: Optional[int] = None  # None = no timer


class SessionConfigIn(BaseModel):
    name: Optional[str] = None
    config: SessionConfig


class SessionOut(BaseModel):
    id: int
    code: str
    name: Optional[str]
    status: str
    config: Optional[str]
    question_ids: Optional[str]
    current_index: int
    is_revealed: bool
    total_respondents: int
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SessionPublicOut(BaseModel):
    """Resident-facing session state."""
    code: str
    status: str
    current_index: int
    is_revealed: bool
    total_questions: int
    current_question: Optional[QuestionPublicOut]

    class Config:
        from_attributes = True
