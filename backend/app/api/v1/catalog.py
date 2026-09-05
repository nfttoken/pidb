import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, get_current_user_id, require_roles
from app.models.catalog import Brand, Ingredient, ProductType, SkinConcern, SkinType
from app.schemas.catalog import (
    BrandCreate,
    BrandResponse,
    IngredientCreate,
    IngredientResponse,
    ProductTypeCreate,
    ProductTypeResponse,
    TaxonomyCreate,
    TaxonomyResponse,
)
from app.schemas.common import SuccessResponse


router = APIRouter()


async def _update_catalog_item(db: DbSession, model: type, item_id: uuid.UUID, payload: object):
    item = await db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


async def _deactivate_catalog_item(db: DbSession, model: type, item_id: uuid.UUID):
    item = await db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    item.status = "inactive"
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/brands", response_model=SuccessResponse[list[BrandResponse]])
async def list_brands(db: DbSession, _: str = Depends(get_current_user_id)):
    result = await db.execute(select(Brand).order_by(Brand.name))
    return SuccessResponse(data=list(result.scalars().all()))


@router.post("/brands", response_model=SuccessResponse[BrandResponse], status_code=status.HTTP_201_CREATED)
async def create_brand(
    payload: BrandCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    brand = Brand(**payload.model_dump())
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return SuccessResponse(data=brand)


@router.patch("/brands/{brand_id}", response_model=SuccessResponse[BrandResponse])
async def update_brand(
    brand_id: uuid.UUID,
    payload: BrandCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _update_catalog_item(db, Brand, brand_id, payload))


@router.post("/brands/{brand_id}/deactivate", response_model=SuccessResponse[BrandResponse])
async def deactivate_brand(
    brand_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _deactivate_catalog_item(db, Brand, brand_id))


@router.get("/product-types", response_model=SuccessResponse[list[ProductTypeResponse]])
async def list_product_types(db: DbSession, _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ProductType).order_by(ProductType.sort_order, ProductType.name_en))
    return SuccessResponse(data=list(result.scalars().all()))


@router.post(
    "/product-types",
    response_model=SuccessResponse[ProductTypeResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_product_type(
    payload: ProductTypeCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    if payload.parent_id and await db.get(ProductType, payload.parent_id) is None:
        raise HTTPException(status_code=422, detail="Invalid parent product type")
    product_type = ProductType(**payload.model_dump())
    db.add(product_type)
    await db.commit()
    await db.refresh(product_type)
    return SuccessResponse(data=product_type)


@router.patch("/product-types/{product_type_id}", response_model=SuccessResponse[ProductTypeResponse])
async def update_product_type(
    product_type_id: uuid.UUID,
    payload: ProductTypeCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    if payload.parent_id == product_type_id or (payload.parent_id and await db.get(ProductType, payload.parent_id) is None):
        raise HTTPException(status_code=422, detail="Invalid parent product type")
    return SuccessResponse(data=await _update_catalog_item(db, ProductType, product_type_id, payload))


@router.post("/product-types/{product_type_id}/deactivate", response_model=SuccessResponse[ProductTypeResponse])
async def deactivate_product_type(
    product_type_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _deactivate_catalog_item(db, ProductType, product_type_id))


async def _list_taxonomy(db: DbSession, model: type):
    result = await db.execute(select(model).order_by(model.name_en))
    return list(result.scalars().all())


@router.get("/skin-types", response_model=SuccessResponse[list[TaxonomyResponse]])
async def list_skin_types(db: DbSession, _: str = Depends(get_current_user_id)):
    return SuccessResponse(data=await _list_taxonomy(db, SkinType))


@router.post("/skin-types", response_model=SuccessResponse[TaxonomyResponse], status_code=201)
async def create_skin_type(
    payload: TaxonomyCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    item = SkinType(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return SuccessResponse(data=item)


@router.patch("/skin-types/{skin_type_id}", response_model=SuccessResponse[TaxonomyResponse])
async def update_skin_type(
    skin_type_id: uuid.UUID,
    payload: TaxonomyCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _update_catalog_item(db, SkinType, skin_type_id, payload))


@router.post("/skin-types/{skin_type_id}/deactivate", response_model=SuccessResponse[TaxonomyResponse])
async def deactivate_skin_type(
    skin_type_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _deactivate_catalog_item(db, SkinType, skin_type_id))


@router.get("/skin-concerns", response_model=SuccessResponse[list[TaxonomyResponse]])
async def list_skin_concerns(db: DbSession, _: str = Depends(get_current_user_id)):
    return SuccessResponse(data=await _list_taxonomy(db, SkinConcern))


@router.post("/skin-concerns", response_model=SuccessResponse[TaxonomyResponse], status_code=201)
async def create_skin_concern(
    payload: TaxonomyCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    item = SkinConcern(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return SuccessResponse(data=item)


@router.patch("/skin-concerns/{skin_concern_id}", response_model=SuccessResponse[TaxonomyResponse])
async def update_skin_concern(
    skin_concern_id: uuid.UUID,
    payload: TaxonomyCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _update_catalog_item(db, SkinConcern, skin_concern_id, payload))


@router.post("/skin-concerns/{skin_concern_id}/deactivate", response_model=SuccessResponse[TaxonomyResponse])
async def deactivate_skin_concern(
    skin_concern_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _deactivate_catalog_item(db, SkinConcern, skin_concern_id))


@router.get("/ingredients", response_model=SuccessResponse[list[IngredientResponse]])
async def list_ingredients(
    db: DbSession, search: str | None = None, _: str = Depends(get_current_user_id)
):
    query = select(Ingredient).order_by(Ingredient.inci_name)
    if search:
        query = query.where(Ingredient.inci_name.ilike(f"%{search.strip()}%"))
    result = await db.execute(query)
    return SuccessResponse(data=list(result.scalars().all()))


@router.post("/ingredients", response_model=SuccessResponse[IngredientResponse], status_code=201)
async def create_ingredient(
    payload: IngredientCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    item = Ingredient(**payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return SuccessResponse(data=item)


@router.patch("/ingredients/{ingredient_id}", response_model=SuccessResponse[IngredientResponse])
async def update_ingredient(
    ingredient_id: uuid.UUID,
    payload: IngredientCreate,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _update_catalog_item(db, Ingredient, ingredient_id, payload))


@router.post("/ingredients/{ingredient_id}/deactivate", response_model=SuccessResponse[IngredientResponse])
async def deactivate_ingredient(
    ingredient_id: uuid.UUID,
    db: DbSession,
    _: object = Depends(require_roles("admin", "editor")),
):
    return SuccessResponse(data=await _deactivate_catalog_item(db, Ingredient, ingredient_id))
