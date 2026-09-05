"""Create dynamic product QR mapping.

Revision ID: 0005_product_qr
Revises: 0004_review_and_images
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_product_qr"
down_revision: Union[str, Sequence[str], None] = "0004_review_and_images"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_qr",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("short_code", sa.String(50), nullable=False),
        sa.Column("destination_type", sa.String(30), server_default="product", nullable=False),
        sa.Column("target_url", sa.String(1000), nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("short_code"),
    )
    op.create_index("ix_product_qr_product_id", "product_qr", ["product_id"], unique=False)
    op.create_index("ix_product_qr_short_code", "product_qr", ["short_code"], unique=False)
    op.create_index("ix_product_qr_status", "product_qr", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_product_qr_status", table_name="product_qr")
    op.drop_index("ix_product_qr_short_code", table_name="product_qr")
    op.drop_index("ix_product_qr_product_id", table_name="product_qr")
    op.drop_table("product_qr")

