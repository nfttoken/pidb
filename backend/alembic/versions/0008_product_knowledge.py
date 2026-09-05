"""Complete product knowledge metadata and provenance tables."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0008_product_knowledge"
down_revision: Union[str, Sequence[str], None] = "0007_shopify_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _id_column() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    ]


def upgrade() -> None:
    op.add_column("brands", sa.Column("brand_code", sa.String(80)))
    op.create_index("ix_brands_brand_code", "brands", ["brand_code"], unique=True)
    for column in ("name_ko", "name_ja", "name_en", "name_zh"):
        op.add_column("brands", sa.Column(column, sa.String(255)))
    op.add_column("brands", sa.Column("logo_url", sa.String(1000)))
    op.add_column("ingredients", sa.Column("cosmetic_functions", sa.Text()))
    op.add_column("ingredients", sa.Column("search_keywords", sa.Text()))

    op.create_table(
        "product_claims",
        _id_column(),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("claim_type", sa.String(50), server_default="cosmetic", nullable=False),
        sa.Column("claim_text_en", sa.Text(), nullable=False),
        sa.Column("claim_text_zh", sa.Text()),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_claims_product_id", "product_claims", ["product_id"], unique=False)

    op.create_table(
        "data_sources",
        _id_column(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("source_type", sa.String(50), server_default="supplier", nullable=False),
        sa.Column("source_url", sa.String(1000)),
        sa.Column("notes", sa.Text()),
        *_timestamps(),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "product_source_records",
        _id_column(),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("data_source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_reference", sa.String(255)),
        sa.Column("raw_payload", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True)),
        *_timestamps(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["data_source_id"], ["data_sources.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_source_records_product_id", "product_source_records", ["product_id"], unique=False)
    op.create_index("ix_product_source_records_data_source_id", "product_source_records", ["data_source_id"], unique=False)

    op.create_table(
        "audit_logs",
        _id_column(),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("details", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_product_source_records_data_source_id", table_name="product_source_records")
    op.drop_index("ix_product_source_records_product_id", table_name="product_source_records")
    op.drop_table("product_source_records")
    op.drop_table("data_sources")
    op.drop_index("ix_product_claims_product_id", table_name="product_claims")
    op.drop_table("product_claims")
    op.drop_column("ingredients", "search_keywords")
    op.drop_column("ingredients", "cosmetic_functions")
    op.drop_column("brands", "logo_url")
    for column in ("name_zh", "name_en", "name_ja", "name_ko"):
        op.drop_column("brands", column)
    op.drop_index("ix_brands_brand_code", table_name="brands")
    op.drop_column("brands", "brand_code")
