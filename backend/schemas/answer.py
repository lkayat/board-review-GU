from pydantic import BaseModel
from typing import Optional


class AnswerSubmit(BaseModel):
    session_code: str
    question_index: int
    choice: str  # A | B | C | D


class ChoiceCount(BaseModel):
    choice: str
    count: int
    pct: float


class AggregateOut(BaseModel):
    session_id: int
    question_id: int
    question_index: int
    count_a: int
    count_b: int
    count_c: int
    count_d: int
    total_responses: int
    choices: list[ChoiceCount]  # computed percentages

    class Config:
        from_attributes = True


class TopicSummary(BaseModel):
    topic: str
    label: str
    total_questions: int
    correct_count: int
    pct_correct: float


class QuestionReview(BaseModel):
    question_index: int
    question_text: str
    correct_answer: str
    explanation: Optional[str]
    aggregate: Optional[AggregateOut]
    resident_pct_correct: float


class SummaryOut(BaseModel):
    session_id: int
    session_name: Optional[str]
    total_questions: int
    overall_pct_correct: float
    topics: list[TopicSummary]
    questions: list[QuestionReview]
