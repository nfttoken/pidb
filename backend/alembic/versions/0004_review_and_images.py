"""Create compliance and product image tables.

Revision ID: 0004_review_and_images
Revises: 0003_import_batches
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0004_review_and_images"
down_revision: Union[str, Sequence[str], None] = "0003_import_batches"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "product_canada",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("importer_name", sa.String(255)),
        sa.Column("distributor_name", sa.String(255)),
        sa.Column("canadian_label_status", sa.String(30), server_default="pending", nullable=False),
        sa.Column("cosmetic_notification_status", sa.String(30), server_default="pending", nullable=False),
        sa.Column("compliance_status", sa.String(30), server_default="pending", nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("product_id"),
    )
    op.create_index("ix_product_canada_compliance_status", "product_canada", ["compliance_status"], unique=False)

    op.create_table(
        "product_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_url", sa.String(1000), nullable=False),
        sa.Column("image_type", sa.String(30), server_default="gallery", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("alt_text_en", sa.String(500)),
        sa.Column("alt_text_zh", sa.String(500)),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_product_images_product_id", table_name="product_images")
    op.drop_table("product_images")
    op.drop_index("ix_product_canada_compliance_status", table_name="product_canada")
    op.drop_table("product_canada")

