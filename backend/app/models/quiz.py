import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class QuizSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quiz_sessions"

    session_token: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    status: Mapped[str] = mapped_column(String(20), default="started", index=True)
    answers: Mapped[dict] = mapped_column(JSONB, default=dict)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    answer_rows: Mapped[list["QuizAnswer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class QuizAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quiz_answers"
    __table_args__ = (UniqueConstraint("session_id", "question_code", name="uq_quiz_answers_question"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quiz_sessions.id", ondelete="CASCADE"))
    question_code: Mapped[str] = mapped_column(String(80))
    answer_value: Mapped[str | list[str]] = mapped_column(JSONB)

    session: Mapped[QuizSession] = relationship(back_populates="answer_rows")

