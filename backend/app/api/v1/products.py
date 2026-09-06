import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import DbSession, require_roles
from app.models.catalog import Product
from app.schemas.common import SuccessResponse
from app.schemas.product import (
    PriceSuggestionReview,
    ProductCreate,
    ProductListItem,
    ProductResponse,
    ProductIngredientResponse,
    ProductStatusChange,
    ProductUpdate,
    SkuResponse,
)
from app.schemas.review import (
    ProductCanadaResponse,
    ProductCanadaUpdate,
    ProductImageCreate,
    ProductImageResponse,
    ProductReadinessResponse,
)
from app.models.review import ProductImage
from app.services.products import (
    change_product_status,
    create_product,
    get_product,
    list_products,
    update_product,
)
from app.services.review import (
    calculate_readiness,
    get_product_for_review,
    update_compliance as update_compliance_service,
)


router = APIRouter()


def _to_product_response(product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        product_code=product.product_code,
        original_language=product.original_language,
        original_name=product.original_name,
        product_name_en=product.product_name_en,
        product_name_zh=product.product_name_zh,
        description_en=product.description_en,
        description_zh=product.description_zh,
        how_to_use_en=product.how_to_use_en,
        how_to_use_zh=product.how_to_use_zh,
        warnings_en=product.warnings_en,
        warnings_zh=product.warnings_zh,
        country_of_origin=product.country_of_origin,
        source_inci=product.source_inci,
        attributes=product.attributes,
        status=product.status,
        brand=product.brand,
        product_type=product.product_type,
        skus=product.skus,
        skin_types=product.skin_types,
        skin_concerns=product.skin_concerns,
        ingredients=[
            ProductIngredientResponse(
                ingredient=link.ingredient,
                position=link.position,
                is_key_ingredient=link.is_key_ingredient,
            )
            for link in product.ingredients
        ],
        images=product.images,
        canada=product.canada,
        claims=product.claims,
    )


@router.get("", response_model=SuccessResponse[dict])
async def products(
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    product_status: Annotated[str | None, Query(alias="status")] = None,
    compliance_status: str | None = Query(default=None),
    brand_id: uuid.UUID | None = Query(default=None),
    product_type_id: uuid.UUID | None = Query(default=None),
):
    items, total = await list_products(
        db,
        offset=offset,
        limit=limit,
        search=search,
        product_status=product_status,
        compliance_status=compliance_status,
        brand_id=brand_id,
        product_type_id=product_type_id,
    )
    data = {
        "items": [
            ProductListItem(
                id=product.id,
                product_code=product.product_code,
                product_name_en=product.product_name_en,
                brand_name=brand_name,
                product_type_name=product_type_name,
                status=product.status,
                compliance_status=product.canada.compliance_status if product.canada else None,
            )
            for product, brand_name, product_type_name in items
        ],
        "total": total,
        "offset": offset,
        "limit": limit,
    }
    return SuccessResponse(data=data)


@router.post("", response_model=SuccessResponse[ProductResponse], status_code=status.HTTP_201_CREATED)
async def create(
    payload: ProductCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=_to_product_response(await create_product(db, payload)))


@router.get("/{product_id}", response_model=SuccessResponse[ProductResponse])
async def detail(product_id: uuid.UUID, db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    product = await get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=_to_product_response(product))


@router.patch("/{product_id}", response_model=SuccessResponse[ProductResponse])
async def update(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    product = await get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=_to_product_response(await update_product(db, product, payload)))


@router.post("/{product_id}/skus/{sku_id}/price-suggestion/status", response_model=SuccessResponse[SkuResponse])
async def review_price_suggestion(
    product_id: uuid.UUID,
    sku_id: uuid.UUID,
    payload: PriceSuggestionReview,
    db: DbSession,
    current_user=Depends(require_roles("admin", "reviewer")),
):
    product = await get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    sku = next((item for item in product.skus if item.id == sku_id), None)
    if sku is None:
        raise HTTPException(status_code=404, detail="SKU not found")
    if payload.status == "approved" and sku.suggested_price is None:
        raise HTTPException(status_code=409, detail="A suggested price is required before approval")
    sku.suggested_price_status = payload.status
    sku.suggested_price_note = payload.note
    if payload.status == "pending":
        sku.suggested_price_reviewed_at = None
        sku.suggested_price_reviewed_by = None
    else:
        from datetime import UTC, datetime

        sku.suggested_price_reviewed_at = datetime.now(UTC)
        sku.suggested_price_reviewed_by = current_user.id
    await db.commit()
    await db.refresh(sku)
    return SuccessResponse(data=sku)


@router.post("/{product_id}/status", response_model=SuccessResponse[ProductResponse])
async def change_status(
    product_id: uuid.UUID,
    payload: ProductStatusChange,
    db: DbSession,
    _: object = Depends(require_roles("admin", "reviewer")),
):
    product = await get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.status == "ready":
        readiness_result = calculate_readiness(product)
        if not readiness_result.ready:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "PRODUCT_NOT_READY",
                    "message": "Product must pass all readiness checks before becoming ready",
                    "blockers": readiness_result.blockers,
                },
            )
    product = await change_product_status(db, product, payload.status)
    return SuccessResponse(data=_to_product_response(product))


@router.get("/{product_id}/readiness", response_model=SuccessResponse[ProductReadinessResponse])
async def readiness(product_id: uuid.UUID, db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    product = await get_product_for_review(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=calculate_readiness(product))


@router.post("/{product_id}/images", response_model=SuccessResponse[ProductImageResponse], status_code=201)
async def add_image(
    product_id: uuid.UUID,
    payload: ProductImageCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    if await db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    image = ProductImage(product_id=product_id, **payload.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return SuccessResponse(data=image)


@router.get("/{product_id}/images", response_model=SuccessResponse[list[ProductImageResponse]])
async def list_images(
    product_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor", "reviewer")),
):
    product = await get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=product.images)


@router.patch("/{product_id}/images/{image_id}", response_model=SuccessResponse[ProductImageResponse])
async def update_image(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    payload: ProductImageCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    image = await db.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(status_code=404, detail="Product image not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(image, field, value)
    await db.commit()
    await db.refresh(image)
    return SuccessResponse(data=image)


@router.post("/{product_id}/images/{image_id}/deactivate", response_model=SuccessResponse[ProductImageResponse])
async def deactivate_image(
    product_id: uuid.UUID,
    image_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    image = await db.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(status_code=404, detail="Product image not found")
    image.status = "inactive"
    await db.commit()
    await db.refresh(image)
    return SuccessResponse(data=image)


@router.get("/{product_id}/compliance", response_model=SuccessResponse[ProductCanadaResponse | None])
async def compliance(product_id: uuid.UUID, db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    product = await get_product_for_review(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=product.canada)


@router.put("/{product_id}/compliance", response_model=SuccessResponse[ProductCanadaResponse])
async def update_compliance(
    product_id: uuid.UUID,
    payload: ProductCanadaUpdate,
    db: DbSession,
    current_user=Depends(require_roles("admin", "editor", "reviewer")),
):
    if payload.compliance_status in {"approved", "blocked"} and current_user.role not in {"admin", "reviewer"}:
        raise HTTPException(status_code=403, detail="Only Admin or Reviewer can finalize compliance")
    return SuccessResponse(data=await update_compliance_service(db, product_id, payload))
