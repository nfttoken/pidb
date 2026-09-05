import secrets
import string
import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.catalog import Product, ProductIngredient
from app.models.qr import ProductQr


SHORT_CODE_ALPHABET = string.ascii_uppercase + string.digits


def create_short_code(length: int = 6) -> str:
    return "".join(secrets.choice(SHORT_CODE_ALPHABET) for _ in range(length))


async def _allocate_short_code(db: AsyncSession) -> str:
    for _ in range(5):
        short_code = create_short_code()
        if await db.scalar(select(ProductQr.id).where(ProductQr.short_code == short_code)) is None:
            return short_code
    raise HTTPException(status_code=500, detail="Could not allocate QR short code")


async def create_product_qr(
    db: AsyncSession, product_id: uuid.UUID, destination_type: str = "product"
) -> ProductQr:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    short_code = await _allocate_short_code(db)

    qr = ProductQr(
        product_id=product_id,
        short_code=short_code,
        destination_type=destination_type,
        target_url=f"{settings.public_base_url.rstrip('/')}/p/{short_code}",
    )
    db.add(qr)
    await db.commit()
    await db.refresh(qr)
    return qr


async def list_product_qrs(db: AsyncSession) -> list[ProductQr]:
    result = await db.execute(
        select(ProductQr)
        .options(selectinload(ProductQr.product))
        .order_by(ProductQr.created_at.desc())
    )
    return list(result.scalars().all())


async def deactivate_product_qr(db: AsyncSession, short_code: str) -> ProductQr:
    qr = await db.scalar(select(ProductQr).where(ProductQr.short_code == short_code))
    if qr is None:
        raise HTTPException(status_code=404, detail="QR code not found")
    qr.status = "inactive"
    await db.commit()
    await db.refresh(qr)
    return qr


async def regenerate_product_qr(db: AsyncSession, short_code: str) -> ProductQr:
    qr = await db.scalar(select(ProductQr).where(ProductQr.short_code == short_code))
    if qr is None:
        raise HTTPException(status_code=404, detail="QR code not found")

    qr.status = "inactive"
    new_short_code = await _allocate_short_code(db)
    new_qr = ProductQr(
        product_id=qr.product_id,
        short_code=new_short_code,
        destination_type=qr.destination_type,
        target_url=f"{settings.public_base_url.rstrip('/')}/p/{new_short_code}",
    )
    db.add(new_qr)
    await db.commit()
    await db.refresh(new_qr)
    return new_qr


async def resolve_qr(db: AsyncSession, short_code: str) -> ProductQr | None:
    result = await db.execute(
        select(ProductQr)
        .options(
            selectinload(ProductQr.product).selectinload(Product.brand),
            selectinload(ProductQr.product).selectinload(Product.product_type),
            selectinload(ProductQr.product).selectinload(Product.skin_types),
            selectinload(ProductQr.product).selectinload(Product.skin_concerns),
            selectinload(ProductQr.product).selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
            selectinload(ProductQr.product).selectinload(Product.images),
            selectinload(ProductQr.product).selectinload(Product.canada),
            selectinload(ProductQr.product).selectinload(Product.shopify_mapping),
        )
        .where(ProductQr.short_code == short_code, ProductQr.status == "active")
    )
    qr = result.scalar_one_or_none()
    if (
        qr is None
        or qr.product.status not in {"published", "active"}
        or qr.product.canada is None
        or qr.product.canada.compliance_status != "approved"
    ):
        return None
    return qr
