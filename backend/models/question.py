from sqlalchemy import Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(32), default="local")  # local | radiopaedia | statpearls | radcored

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False)  # A | B | C | D

    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Image fields
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_frames: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of URLs
    image_type: Mapped[str | None] = mapped_column(String(16), nullable=True)  # CT | MRI | US | XR | NM
    is_image_based: Mapped[bool] = mapped_column(Boolean, default=False)

    # Taxonomy
    topic: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    subtopic: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    modality: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)  # basic | intermediate | advanced
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | draft

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
