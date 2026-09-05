import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.schemas.common import SuccessResponse
from app.schemas.public import PublicProductResponse
from app.services.public import get_public_product, to_public_product


router = APIRouter()


@router.get("/products/{product_id}", response_model=SuccessResponse[PublicProductResponse])
async def product(product_id: uuid.UUID, db: DbSession):
    value = await get_public_product(db, product_id)
    if value is None:
        raise HTTPException(status_code=404, detail={"code": "RESOURCE_NOT_FOUND", "message": "Product not found"})
    return SuccessResponse(data=to_public_product(value))
