import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import Product
from app.models.review import ProductCanada
from app.schemas.review import ProductCanadaUpdate, ProductReadinessResponse, ReadinessCheck


def calculate_readiness(product: Product) -> ProductReadinessResponse:
    checks = [
        ReadinessCheck(
            key="required_information",
            label="Required product information",
            passed=all(
                [
                    product.product_code,
                    product.original_language,
                    product.original_name,
                    product.product_name_en,
                    product.product_name_zh,
                    product.country_of_origin,
                ]
            ),
            weight=25,
        ),
        ReadinessCheck(
            key="content",
            label="English and Chinese content",
            passed=all(
                [
                    product.description_en,
                    product.description_zh,
                    product.how_to_use_en,
                    product.how_to_use_zh,
                ]
            ),
            weight=20,
        ),
        ReadinessCheck(
            key="classification",
            label="Product classification",
            passed=bool(product.brand and product.product_type and (product.skin_types or product.skin_concerns)),
            weight=15,
        ),
        ReadinessCheck(
            key="ingredients",
            label="Ingredient information",
            passed=bool(product.source_inci or product.ingredients),
            weight=15,
        ),
        ReadinessCheck(
            key="images",
            label="Product images",
            passed=bool(product.images),
            weight=15,
        ),
        ReadinessCheck(
            key="compliance",
            label="Canada compliance approved",
            passed=bool(product.canada and product.canada.compliance_status == "approved"),
            weight=10,
        ),
    ]
    score = sum(check.weight for check in checks if check.passed)
    blockers = [check.label for check in checks if not check.passed]
    return ProductReadinessResponse(
        product_id=product.id,
        score=score,
        ready=score == 100,
        checks=checks,
        blockers=blockers,
    )


async def get_product_for_review(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.product_type),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients),
            selectinload(Product.images),
            selectinload(Product.canada),
        )
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def update_compliance(
    db: AsyncSession, product_id: uuid.UUID, payload: ProductCanadaUpdate
) -> ProductCanada:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    compliance = await db.scalar(select(ProductCanada).where(ProductCanada.product_id == product_id))
    if compliance is None:
        compliance = ProductCanada(product_id=product_id)
        db.add(compliance)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(compliance, field, value)
    if compliance.compliance_status in {"approved", "blocked"}:
        compliance.reviewed_at = datetime.now(UTC)
    else:
        compliance.reviewed_at = None
    await db.commit()
    await db.refresh(compliance)
    return compliance
