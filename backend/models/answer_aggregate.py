from sqlalchemy import Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


class AnswerAggregate(Base):
    __tablename__ = "answer_aggregates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, nullable=False)
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)

    count_a: Mapped[int] = mapped_column(Integer, default=0)
    count_b: Mapped[int] = mapped_column(Integer, default=0)
    count_c: Mapped[int] = mapped_column(Integer, default=0)
    count_d: Mapped[int] = mapped_column(Integer, default=0)
    total_responses: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
