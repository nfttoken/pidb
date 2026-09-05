import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProductQr(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_qr"
    __table_args__ = (UniqueConstraint("short_code", name="uq_product_qr_short_code"),)

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    short_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    destination_type: Mapped[str] = mapped_column(String(30), default="product")
    target_url: Mapped[str] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)

    product: Mapped["Product"] = relationship(back_populates="qrs")

