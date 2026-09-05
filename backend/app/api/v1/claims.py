import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, require_roles
from app.models.catalog import Product, ProductClaim
from app.schemas.claims import ProductClaimCreate, ProductClaimResponse
from app.schemas.common import SuccessResponse


router = APIRouter()


@router.get("/products/{product_id}/claims", response_model=SuccessResponse[list[ProductClaimResponse]])
async def list_claims(product_id: uuid.UUID, db: DbSession, _: object = Depends(require_roles("admin", "editor", "reviewer"))):
    result = await db.execute(select(Product).options(selectinload(Product.claims)).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return SuccessResponse(data=product.claims)


@router.post("/products/{product_id}/claims", response_model=SuccessResponse[ProductClaimResponse], status_code=201)
async def create_claim(product_id: uuid.UUID, payload: ProductClaimCreate, db: DbSession, _: object = Depends(require_roles("admin", "editor"))):
    if await db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    claim = ProductClaim(product_id=product_id, **payload.model_dump())
    db.add(claim)
    await db.commit()
    await db.refresh(claim)
    return SuccessResponse(data=claim)


@router.patch("/products/{product_id}/claims/{claim_id}", response_model=SuccessResponse[ProductClaimResponse])
async def update_claim(product_id: uuid.UUID, claim_id: uuid.UUID, payload: ProductClaimCreate, db: DbSession, _: object = Depends(require_roles("admin", "editor"))):
    claim = await db.get(ProductClaim, claim_id)
    if claim is None or claim.product_id != product_id:
        raise HTTPException(status_code=404, detail="Product claim not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(claim, field, value)
    await db.commit()
    await db.refresh(claim)
    return SuccessResponse(data=claim)


@router.post("/products/{product_id}/claims/{claim_id}/deactivate", response_model=SuccessResponse[ProductClaimResponse])
async def deactivate_claim(product_id: uuid.UUID, claim_id: uuid.UUID, db: DbSession, _: object = Depends(require_roles("admin", "editor"))):
    claim = await db.get(ProductClaim, claim_id)
    if claim is None or claim.product_id != product_id:
        raise HTTPException(status_code=404, detail="Product claim not found")
    claim.status = "inactive"
    await db.commit()
    await db.refresh(claim)
    return SuccessResponse(data=claim)
