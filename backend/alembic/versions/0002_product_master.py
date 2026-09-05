"""Create PIDB product master tables.

Revision ID: 0002_product_master
Revises: 0001_auth
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_product_master"
down_revision: Union[str, Sequence[str], None] = "0001_auth"
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
    op.create_table(
        "brands",
        _id_column(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(180), nullable=False),
        sa.Column("country_of_origin", sa.String(2)),
        sa.Column("website_url", sa.String(500)),
        sa.Column("description_en", sa.Text()),
        sa.Column("description_zh", sa.Text()),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_brands_slug", "brands", ["slug"], unique=False)

    op.create_table(
        "product_types",
        _id_column(),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("name_en", sa.String(150), nullable=False),
        sa.Column("name_zh", sa.String(150)),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["parent_id"], ["product_types.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_product_types_code", "product_types", ["code"], unique=False)

    for table_name, code_length, name_length in [
        ("skin_types", 50, 100),
        ("skin_concerns", 80, 150),
    ]:
        op.create_table(
            table_name,
            _id_column(),
            sa.Column("code", sa.String(code_length), nullable=False),
            sa.Column("name_en", sa.String(name_length), nullable=False),
            sa.Column("name_zh", sa.String(name_length)),
            sa.Column("status", sa.String(20), server_default="active", nullable=False),
            *_timestamps(),
            sa.UniqueConstraint("code"),
        )
        op.create_index(f"ix_{table_name}_code", table_name, ["code"], unique=False)

    op.create_table(
        "ingredients",
        _id_column(),
        sa.Column("inci_name", sa.String(255), nullable=False),
        sa.Column("common_name_en", sa.String(255)),
        sa.Column("common_name_zh", sa.String(255)),
        sa.Column("common_name_ko", sa.String(255)),
        sa.Column("common_name_ja", sa.String(255)),
        sa.Column("description_en", sa.Text()),
        sa.Column("description_zh", sa.Text()),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("inci_name"),
    )
    op.create_index("ix_ingredients_inci_name", "ingredients", ["inci_name"], unique=False)

    op.create_table(
        "products",
        _id_column(),
        sa.Column("product_code", sa.String(50), nullable=False),
        sa.Column("brand_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_language", sa.String(10), nullable=False),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("product_name_en", sa.String(500), nullable=False),
        sa.Column("product_name_zh", sa.String(500)),
        sa.Column("description_en", sa.Text()),
        sa.Column("description_zh", sa.Text()),
        sa.Column("how_to_use_en", sa.Text()),
        sa.Column("how_to_use_zh", sa.Text()),
        sa.Column("warnings_en", sa.Text()),
        sa.Column("warnings_zh", sa.Text()),
        sa.Column("country_of_origin", sa.String(2)),
        sa.Column("source_inci", sa.Text()),
        sa.Column("status", sa.String(30), server_default="draft", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["brand_id"], ["brands.id"]),
        sa.ForeignKeyConstraint(["product_type_id"], ["product_types.id"]),
        sa.UniqueConstraint("product_code"),
    )
    op.create_index("ix_products_product_code", "products", ["product_code"], unique=False)
    op.create_index("ix_products_status", "products", ["status"], unique=False)

    op.create_table(
        "product_skus",
        _id_column(),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("barcode", sa.String(50)),
        sa.Column("variant_name_en", sa.String(255)),
        sa.Column("variant_name_zh", sa.String(255)),
        sa.Column("net_quantity", sa.Numeric(12, 3)),
        sa.Column("quantity_unit", sa.String(20)),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("sku"),
        sa.UniqueConstraint("barcode"),
    )
    op.create_index("ix_product_skus_sku", "product_skus", ["sku"], unique=False)
    op.create_index("ix_product_skus_barcode", "product_skus", ["barcode"], unique=False)

    op.create_table(
        "product_skin_types",
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skin_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skin_type_id"], ["skin_types.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("product_id", "skin_type_id"),
    )
    op.create_table(
        "product_concerns",
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skin_concern_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skin_concern_id"], ["skin_concerns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("product_id", "skin_concern_id"),
    )
    op.create_table(
        "product_ingredients",
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer()),
        sa.Column("is_key_ingredient", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ingredient_id"], ["ingredients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("product_id", "ingredient_id"),
    )


def downgrade() -> None:
    op.drop_table("product_ingredients")
    op.drop_table("product_concerns")
    op.drop_table("product_skin_types")
    op.drop_index("ix_product_skus_barcode", table_name="product_skus")
    op.drop_index("ix_product_skus_sku", table_name="product_skus")
    op.drop_table("product_skus")
    op.drop_index("ix_products_status", table_name="products")
    op.drop_index("ix_products_product_code", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_ingredients_inci_name", table_name="ingredients")
    op.drop_table("ingredients")
    op.drop_index("ix_skin_concerns_code", table_name="skin_concerns")
    op.drop_table("skin_concerns")
    op.drop_index("ix_skin_types_code", table_name="skin_types")
    op.drop_table("skin_types")
    op.drop_index("ix_product_types_code", table_name="product_types")
    op.drop_table("product_types")
    op.drop_index("ix_brands_slug", table_name="brands")
    op.drop_table("brands")

