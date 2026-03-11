from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class QuestionBase(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    topic: str
    subtopic: Optional[str] = None
    modality: Optional[str] = None
    difficulty: Optional[str] = None
    is_image_based: bool = False
    image_url: Optional[str] = None
    image_frames: Optional[str] = None
    image_type: Optional[str] = None
    explanation: Optional[str] = None
    reference: Optional[str] = None
    tags: Optional[str] = None
    source: str = "local"


class QuestionCreate(QuestionBase):
    correct_answer: str  # A | B | C | D


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    reference: Optional[str] = None
    image_url: Optional[str] = None
    image_type: Optional[str] = None
    is_image_based: Optional[bool] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    modality: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class QuestionOut(QuestionBase):
    id: int
    correct_answer: str
    is_active: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionPublicOut(QuestionBase):
    """Resident-facing view — no correct_answer or explanation."""
    id: int
    status: str

    class Config:
        from_attributes = True


class TopicStat(BaseModel):
    topic: str
    label: str
    total: int
    image_based: int
    text_only: int
    basic: int
    intermediate: int
    advanced: int


class QuestionStatsOut(BaseModel):
    total: int
    topics: list[TopicStat]
