import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Table, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


product_skin_types = Table(
    "product_skin_types",
    Base.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("skin_type_id", UUID(as_uuid=True), ForeignKey("skin_types.id", ondelete="CASCADE"), primary_key=True),
)

product_concerns = Table(
    "product_concerns",
    Base.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("skin_concern_id", UUID(as_uuid=True), ForeignKey("skin_concerns.id", ondelete="CASCADE"), primary_key=True),
)


class Brand(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "brands"

    brand_code: Mapped[str | None] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    name_ko: Mapped[str | None] = mapped_column(String(255))
    name_ja: Mapped[str | None] = mapped_column(String(255))
    name_en: Mapped[str | None] = mapped_column(String(255))
    name_zh: Mapped[str | None] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    country_of_origin: Mapped[str | None] = mapped_column(String(2))
    website_url: Mapped[str | None] = mapped_column(String(500))
    logo_url: Mapped[str | None] = mapped_column(String(1000))
    description_en: Mapped[str | None] = mapped_column(Text)
    description_zh: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")

    products: Mapped[list["Product"]] = relationship(back_populates="brand")


class ProductType(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_types"

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("product_types.id", ondelete="SET NULL")
    )
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(150))
    name_zh: Mapped[str | None] = mapped_column(String(150))
    sort_order: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")

    parent: Mapped["ProductType | None"] = relationship(
        remote_side="ProductType.id", back_populates="children"
    )
    children: Mapped[list["ProductType"]] = relationship(back_populates="parent")
    products: Mapped[list["Product"]] = relationship(back_populates="product_type")


class SkinType(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "skin_types"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(100))
    name_zh: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="active")

    products: Mapped[list["Product"]] = relationship(
        secondary=product_skin_types, back_populates="skin_types"
    )


class SkinConcern(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "skin_concerns"

    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(150))
    name_zh: Mapped[str | None] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(20), default="active")

    products: Mapped[list["Product"]] = relationship(
        secondary=product_concerns, back_populates="skin_concerns"
    )


class Ingredient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ingredients"

    inci_name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    common_name_en: Mapped[str | None] = mapped_column(String(255))
    common_name_zh: Mapped[str | None] = mapped_column(String(255))
    common_name_ko: Mapped[str | None] = mapped_column(String(255))
    common_name_ja: Mapped[str | None] = mapped_column(String(255))
    description_en: Mapped[str | None] = mapped_column(Text)
    description_zh: Mapped[str | None] = mapped_column(Text)
    cosmetic_functions: Mapped[str | None] = mapped_column(Text)
    search_keywords: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active")

    products: Mapped[list["ProductIngredient"]] = relationship(
        back_populates="ingredient", cascade="all, delete-orphan"
    )


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"

    product_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("brands.id"))
    product_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_types.id"))
    original_language: Mapped[str] = mapped_column(String(10))
    original_name: Mapped[str] = mapped_column(String(500))
    product_name_en: Mapped[str] = mapped_column(String(500))
    product_name_zh: Mapped[str | None] = mapped_column(String(500))
    description_en: Mapped[str | None] = mapped_column(Text)
    description_zh: Mapped[str | None] = mapped_column(Text)
    how_to_use_en: Mapped[str | None] = mapped_column(Text)
    how_to_use_zh: Mapped[str | None] = mapped_column(Text)
    warnings_en: Mapped[str | None] = mapped_column(Text)
    warnings_zh: Mapped[str | None] = mapped_column(Text)
    country_of_origin: Mapped[str | None] = mapped_column(String(2))
    source_inci: Mapped[str | None] = mapped_column(Text)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)

    brand: Mapped[Brand] = relationship(back_populates="products")
    product_type: Mapped[ProductType] = relationship(back_populates="products")
    skus: Mapped[list["ProductSku"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    skin_types: Mapped[list[SkinType]] = relationship(
        secondary=product_skin_types, back_populates="products"
    )
    skin_concerns: Mapped[list[SkinConcern]] = relationship(
        secondary=product_concerns, back_populates="products"
    )
    ingredients: Mapped[list["ProductIngredient"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    canada: Mapped["ProductCanada | None"] = relationship(
        back_populates="product", cascade="all, delete-orphan", uselist=False
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    qrs: Mapped[list["ProductQr"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    shopify_mapping: Mapped["ShopifyMapping | None"] = relationship(
        back_populates="product", cascade="all, delete-orphan", uselist=False
    )
    claims: Mapped[list["ProductClaim"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductClaim.sort_order"
    )


class ProductSku(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_skus"
    __table_args__ = (UniqueConstraint("sku", name="uq_product_skus_sku"),)

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    variant_name_en: Mapped[str | None] = mapped_column(String(255))
    variant_name_zh: Mapped[str | None] = mapped_column(String(255))
    net_quantity: Mapped[float | None] = mapped_column(Numeric(12, 3))
    quantity_unit: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="active")

    product: Mapped[Product] = relationship(back_populates="skus")


class ProductIngredient(Base):
    __tablename__ = "product_ingredients"
    __table_args__ = (UniqueConstraint("product_id", "ingredient_id", name="uq_product_ingredients"),)

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int | None] = mapped_column(Integer)
    is_key_ingredient: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped[Product] = relationship(back_populates="ingredients")
    ingredient: Mapped[Ingredient] = relationship(back_populates="products")


class ProductClaim(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_claims"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    claim_type: Mapped[str] = mapped_column(String(50), default="cosmetic")
    claim_text_en: Mapped[str] = mapped_column(Text)
    claim_text_zh: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")

    product: Mapped[Product] = relationship(back_populates="claims")
