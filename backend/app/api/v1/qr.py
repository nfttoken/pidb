import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import DbSession, require_roles
from app.schemas.common import SuccessResponse
from app.schemas.qr import QrCreate, QrListItem, QrResolutionResponse, QrResponse
from app.services.public import to_public_product
from app.services.qr import (
    create_product_qr,
    deactivate_product_qr,
    list_product_qrs,
    regenerate_product_qr,
    resolve_qr,
)


router = APIRouter()
ViewQrUser = Depends(require_roles("admin", "editor", "reviewer"))
ManageQrUser = Depends(require_roles("admin", "editor"))


@router.get("/qr", response_model=SuccessResponse[list[QrListItem]])
async def list_qr_codes(db: DbSession, _: object = ViewQrUser):
    qrs = await list_product_qrs(db)
    return SuccessResponse(
        data=[
            QrListItem(
                id=qr.id,
                product_id=qr.product_id,
                short_code=qr.short_code,
                destination_type=qr.destination_type,
                target_url=qr.target_url,
                status=qr.status,
                created_at=qr.created_at,
                product_code=qr.product.product_code,
                product_name_en=qr.product.product_name_en,
                product_status=qr.product.status,
            )
            for qr in qrs
        ]
    )


@router.post("/qr/products/{product_id}", response_model=SuccessResponse[QrResponse], status_code=status.HTTP_201_CREATED)
async def generate_qr(
    product_id: uuid.UUID,
    payload: QrCreate,
    db: DbSession,
    _: object = ManageQrUser,
):
    qr = await create_product_qr(db, product_id, payload.destination_type)
    return SuccessResponse(data=qr)


@router.post("/qr/{short_code}/deactivate", response_model=SuccessResponse[QrResponse])
async def deactivate_qr(short_code: str, db: DbSession, _: object = ManageQrUser):
    return SuccessResponse(data=await deactivate_product_qr(db, short_code))


@router.post("/qr/{short_code}/regenerate", response_model=SuccessResponse[QrResponse])
async def regenerate_qr(short_code: str, db: DbSession, _: object = ManageQrUser):
    return SuccessResponse(data=await regenerate_product_qr(db, short_code))


@router.get("/qr/{short_code}", response_model=SuccessResponse[QrResolutionResponse])
async def resolve(short_code: str, db: DbSession):
    qr = await resolve_qr(db, short_code)
    if qr is None:
        raise HTTPException(status_code=404, detail={"code": "QR_NOT_FOUND", "message": "QR code not found"})
    product = qr.product
    return SuccessResponse(
        data=QrResolutionResponse(
            short_code=qr.short_code,
            target_url=qr.target_url,
            product_id=product.id,
            product_code=product.product_code,
            product_name_en=product.product_name_en,
            product_name_zh=product.product_name_zh,
            product_status=product.status,
            product=to_public_product(product),
        )
    )
