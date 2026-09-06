import uuid

from fastapi import HTTPException, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import (
    Brand,
    Ingredient,
    Product,
    ProductClaim,
    ProductIngredient,
    ProductSku,
    ProductType,
    SkinConcern,
    SkinType,
)
from app.models.review import ProductCanada
from app.schemas.product import ProductCreate, ProductUpdate


VALID_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"imported"},
    "imported": {"processing"},
    "processing": {"review"},
    "review": {"ready", "processing"},
    "ready": {"published", "review"},
    "published": {"active", "inactive"},
    "active": {"inactive", "discontinued"},
    "inactive": {"active", "discontinued"},
    "discontinued": set(),
}


def validate_status_transition(current: str, target: str) -> None:
    if current == target:
        return
    if target not in VALID_STATUS_TRANSITIONS.get(current, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "INVALID_STATUS_TRANSITION",
                "message": f"Cannot change product status from {current} to {target}",
            },
        )


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.product_type),
            selectinload(Product.skus),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
            selectinload(Product.images),
            selectinload(Product.canada),
            selectinload(Product.claims),
        )
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def list_products(
    db: AsyncSession,
    *,
    offset: int,
    limit: int,
    search: str | None,
    product_status: str | None,
    compliance_status: str | None = None,
    brand_id: uuid.UUID | None = None,
    product_type_id: uuid.UUID | None = None,
) -> tuple[list[tuple[Product, str, str]], int]:
    query = select(Product, Brand.name, ProductType.name_en).join(Brand).join(ProductType)
    count_query = select(func.count(Product.id))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            Product.product_code.ilike(pattern) | Product.product_name_en.ilike(pattern)
        )
        count_query = count_query.where(
            Product.product_code.ilike(pattern) | Product.product_name_en.ilike(pattern)
        )
    if product_status:
        query = query.where(Product.status == product_status)
        count_query = count_query.where(Product.status == product_status)
    if brand_id:
        query = query.where(Product.brand_id == brand_id)
        count_query = count_query.where(Product.brand_id == brand_id)
    if product_type_id:
        query = query.where(Product.product_type_id == product_type_id)
        count_query = count_query.where(Product.product_type_id == product_type_id)
    if compliance_status:
        compliance_statuses = [value.strip() for value in compliance_status.split(",") if value.strip()]
        compliance_filter = or_(
            ProductCanada.id.is_(None), ProductCanada.compliance_status.in_(compliance_statuses)
        )
        query = query.outerjoin(ProductCanada, ProductCanada.product_id == Product.id).where(compliance_filter)
        count_query = count_query.outerjoin(ProductCanada, ProductCanada.product_id == Product.id).where(compliance_filter)

    result = await db.execute(
        query.options(selectinload(Product.canada))
        .order_by(Product.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    total = await db.scalar(count_query)
    return list(result.all()), total or 0


async def create_product(db: AsyncSession, payload: ProductCreate) -> Product:
    existing = await db.scalar(select(Product.id).where(Product.product_code == payload.product_code))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product code already exists")

    brand = await db.get(Brand, payload.brand_id)
    product_type = await db.get(ProductType, payload.product_type_id)
    if brand is None or product_type is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid catalog reference")

    skin_types = await _get_references(db, SkinType, payload.skin_type_ids)
    skin_concerns = await _get_references(db, SkinConcern, payload.skin_concern_ids)
    ingredient_inputs = payload.ingredients or [
        {"ingredient_id": ingredient_id} for ingredient_id in payload.ingredient_ids
    ]
    ingredient_ids = [
        item["ingredient_id"] if isinstance(item, dict) else item.ingredient_id
        for item in ingredient_inputs
    ]
    ingredients = await _get_references(db, Ingredient, ingredient_ids)
    if len(skin_types) != len(set(payload.skin_type_ids)):
        raise HTTPException(status_code=422, detail="Invalid skin type reference")
    if len(skin_concerns) != len(set(payload.skin_concern_ids)):
        raise HTTPException(status_code=422, detail="Invalid skin concern reference")
    if len(ingredients) != len(set(ingredient_ids)):
        raise HTTPException(status_code=422, detail="Invalid ingredient reference")

    await _validate_skus(db, payload.skus)

    product = Product(
        **payload.model_dump(
            exclude={"skus", "skin_type_ids", "skin_concern_ids", "ingredient_ids", "ingredients", "claims"}
        ),
        brand=brand,
        product_type=product_type,
        skin_types=skin_types,
        skin_concerns=skin_concerns,
        skus=[ProductSku(**sku.model_dump(suggested_price_currency=sku.suggested_price_currency.upper())) for sku in payload.skus],
        ingredients=[
            ProductIngredient(
                ingredient=ingredient,
                position=item.get("position") if isinstance(item, dict) else item.position,
                is_key_ingredient=(
                    item.get("is_key_ingredient", False)
                    if isinstance(item, dict)
                    else item.is_key_ingredient
                ),
            )
            for item, ingredient in zip(ingredient_inputs, ingredients, strict=True)
        ],
        claims=[ProductClaim(**claim.model_dump()) for claim in payload.claims],
    )
    db.add(product)
    await db.commit()
    result = await get_product(db, product.id)
    if result is None:
        raise HTTPException(status_code=500, detail="Created product could not be loaded")
    return result


async def update_product(db: AsyncSession, product: Product, payload: ProductUpdate) -> Product:
    values = payload.model_dump(exclude_unset=True)
    relationship_fields = {
        "skus", "skin_type_ids", "skin_concern_ids", "ingredient_ids", "ingredients", "claims"
    }
    for field, value in values.items():
        if field not in relationship_fields:
            setattr(product, field, value)

    if "brand_id" in values and await db.get(Brand, values["brand_id"]) is None:
        raise HTTPException(status_code=422, detail="Invalid brand reference")
    if "product_type_id" in values and await db.get(ProductType, values["product_type_id"]) is None:
        raise HTTPException(status_code=422, detail="Invalid product type reference")

    if "skus" in values:
        await _validate_skus(db, payload.skus or [], exclude_product_id=product.id)
        previous_skus = {sku.sku: sku for sku in product.skus}
        await db.execute(delete(ProductSku).where(ProductSku.product_id == product.id))
        await db.flush()
        product.skus = []
        for sku in payload.skus or []:
            currency = sku.suggested_price_currency.upper()
            values_for_sku = sku.model_dump(suggested_price_currency=currency)
            previous = previous_skus.get(sku.sku)
            same_price = previous and previous.suggested_price == sku.suggested_price and previous.suggested_price_currency == currency
            if same_price:
                values_for_sku.update(
                    suggested_price_status=previous.suggested_price_status,
                    suggested_price_note=previous.suggested_price_note,
                    suggested_price_reviewed_at=previous.suggested_price_reviewed_at,
                    suggested_price_reviewed_by=previous.suggested_price_reviewed_by,
                )
            product.skus.append(ProductSku(**values_for_sku))

    if "skin_type_ids" in values:
        skin_types = await _get_references(db, SkinType, payload.skin_type_ids or [])
        if len(skin_types) != len(set(payload.skin_type_ids or [])):
            raise HTTPException(status_code=422, detail="Invalid skin type reference")
        product.skin_types = skin_types
    if "skin_concern_ids" in values:
        skin_concerns = await _get_references(db, SkinConcern, payload.skin_concern_ids or [])
        if len(skin_concerns) != len(set(payload.skin_concern_ids or [])):
            raise HTTPException(status_code=422, detail="Invalid skin concern reference")
        product.skin_concerns = skin_concerns
    if "ingredients" in values or "ingredient_ids" in values:
        ingredient_inputs = payload.ingredients or [
            {"ingredient_id": ingredient_id} for ingredient_id in payload.ingredient_ids or []
        ]
        ingredient_ids = [
            item["ingredient_id"] if isinstance(item, dict) else item.ingredient_id
            for item in ingredient_inputs
        ]
        ingredients = await _get_references(db, Ingredient, ingredient_ids)
        if len(ingredients) != len(set(ingredient_ids)):
            raise HTTPException(status_code=422, detail="Invalid ingredient reference")
        product.ingredients = [
            ProductIngredient(
                ingredient=ingredient,
                position=item.get("position") if isinstance(item, dict) else item.position,
                is_key_ingredient=(
                    item.get("is_key_ingredient", False)
                    if isinstance(item, dict)
                    else item.is_key_ingredient
                ),
            )
            for item, ingredient in zip(ingredient_inputs, ingredients, strict=True)
        ]
    if "claims" in values:
        product.claims = [ProductClaim(**claim.model_dump()) for claim in payload.claims or []]
    await db.commit()
    result = await get_product(db, product.id)
    if result is None:
        raise HTTPException(status_code=500, detail="Updated product could not be loaded")
    return result


async def change_product_status(db: AsyncSession, product: Product, target_status: str) -> Product:
    validate_status_transition(product.status, target_status)
    product.status = target_status
    await db.commit()
    result = await get_product(db, product.id)
    if result is None:
        raise HTTPException(status_code=500, detail="Updated product could not be loaded")
    return result


async def _get_references(db: AsyncSession, model: type, ids: list[uuid.UUID]):
    if not ids:
        return []
    result = await db.execute(select(model).where(model.id.in_(set(ids))))
    return list(result.scalars().all())


async def _validate_skus(
    db: AsyncSession, skus: list, *, exclude_product_id: uuid.UUID | None = None
) -> None:
    sku_values = [item.sku.strip() for item in skus]
    if len(sku_values) != len(set(sku_values)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE_RESOURCE", "message": "Duplicate SKU in product payload"},
        )
    barcode_values = [item.barcode.strip() for item in skus if item.barcode and item.barcode.strip()]
    if len(barcode_values) != len(set(barcode_values)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE_RESOURCE", "message": "Duplicate barcode in product payload"},
        )
    if sku_values:
        query = select(ProductSku.sku).where(ProductSku.sku.in_(sku_values))
        if exclude_product_id:
            query = query.where(ProductSku.product_id != exclude_product_id)
        existing_skus = set((await db.execute(query)).scalars().all())
        if existing_skus:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "DUPLICATE_RESOURCE", "message": "SKU already exists"},
            )
    if barcode_values:
        query = select(ProductSku.barcode).where(ProductSku.barcode.in_(barcode_values))
        if exclude_product_id:
            query = query.where(ProductSku.product_id != exclude_product_id)
        existing_barcodes = set((await db.execute(query)).scalars().all())
        if existing_barcodes:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "DUPLICATE_RESOURCE", "message": "Barcode already exists"},
            )
