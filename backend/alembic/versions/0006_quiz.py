"""Create Beauty Quiz session and answer tables.

Revision ID: 0006_quiz
Revises: 0005_product_qr
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006_quiz"
down_revision: Union[str, Sequence[str], None] = "0005_product_qr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("attributes", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False))
    op.create_table(
        "quiz_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_token", sa.String(96), nullable=False),
        sa.Column("language", sa.String(10), server_default="en", nullable=False),
        sa.Column("status", sa.String(20), server_default="started", nullable=False),
        sa.Column("answers", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("session_token"),
    )
    op.create_index("ix_quiz_sessions_session_token", "quiz_sessions", ["session_token"], unique=False)
    op.create_index("ix_quiz_sessions_status", "quiz_sessions", ["status"], unique=False)
    op.create_table(
        "quiz_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_code", sa.String(80), nullable=False),
        sa.Column("answer_value", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("session_id", "question_code"),
    )


def downgrade() -> None:
    op.drop_table("quiz_answers")
    op.drop_index("ix_quiz_sessions_status", table_name="quiz_sessions")
    op.drop_index("ix_quiz_sessions_session_token", table_name="quiz_sessions")
    op.drop_table("quiz_sessions")
    op.drop_column("products", "attributes")

