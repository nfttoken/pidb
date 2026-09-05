import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProductCanada(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_canada"
    __table_args__ = (UniqueConstraint("product_id", name="uq_product_canada_product_id"),)

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    importer_name: Mapped[str | None] = mapped_column(String(255))
    distributor_name: Mapped[str | None] = mapped_column(String(255))
    canadian_label_status: Mapped[str] = mapped_column(String(30), default="pending")
    cosmetic_notification_status: Mapped[str] = mapped_column(String(30), default="pending")
    compliance_status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    product: Mapped["Product"] = relationship(back_populates="canada")


class ProductImage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(1000))
    image_type: Mapped[str] = mapped_column(String(30), default="gallery")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    alt_text_en: Mapped[str | None] = mapped_column(String(500))
    alt_text_zh: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="active")

    product: Mapped["Product"] = relationship(back_populates="images")

