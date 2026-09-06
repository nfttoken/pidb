"""Add reviewable per-variant price suggestions."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0009_price_suggestions"
down_revision: Union[str, Sequence[str], None] = "0008_product_knowledge"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("product_skus", sa.Column("suggested_price", sa.Numeric(12, 2), nullable=True))
    op.add_column("product_skus", sa.Column("suggested_price_currency", sa.String(3), server_default="CAD", nullable=False))
    op.add_column("product_skus", sa.Column("suggested_price_status", sa.String(20), server_default="pending", nullable=False))
    op.add_column("product_skus", sa.Column("suggested_price_note", sa.Text(), nullable=True))
    op.add_column("product_skus", sa.Column("suggested_price_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("product_skus", sa.Column("suggested_price_reviewed_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_product_skus_suggested_price_status", "product_skus", ["suggested_price_status"], unique=False)
    op.create_foreign_key(
        "fk_product_skus_suggested_price_reviewed_by_users",
        "product_skus",
        "users",
        ["suggested_price_reviewed_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_product_skus_suggested_price_reviewed_by_users", "product_skus", type_="foreignkey")
    op.drop_index("ix_product_skus_suggested_price_status", table_name="product_skus")
    for column in ("suggested_price_reviewed_by", "suggested_price_reviewed_at", "suggested_price_note", "suggested_price_status", "suggested_price_currency", "suggested_price"):
        op.drop_column("product_skus", column)
