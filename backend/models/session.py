from sqlalchemy import Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    professor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(16), default="building")  # building | active | paused | completed

    # Config stored as JSON blob
    config: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Ordered list of question IDs as JSON array
    question_ids: Mapped[str | None] = mapped_column(Text, nullable=True)

    current_index: Mapped[int] = mapped_column(Integer, default=0)
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    total_respondents: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
