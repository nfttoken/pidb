import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.api.deps import DbSession, require_roles
from app.schemas.common import SuccessResponse
from app.schemas.shopify import (
    ShopifyBatchSyncRequest,
    ShopifyJobResponse,
    ShopifyMappingResponse,
    ShopifySyncRequest,
    ShopifySyncStatusResponse,
    SyncLogResponse,
)
from app.services.shopify import (
    enqueue_sync_job,
    get_sync_status,
    process_sync_job,
)
from app.models.shopify import Job


router = APIRouter()
AdminSyncUser = Depends(require_roles("admin", "reviewer"))


def _job_response(job: Job) -> ShopifyJobResponse:
    return ShopifyJobResponse.model_validate(job)


@router.post(
    "/products/{product_id}/sync",
    response_model=SuccessResponse[ShopifyJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def sync_product(
    product_id: uuid.UUID,
    payload: ShopifySyncRequest,
    db: DbSession,
    _: object = AdminSyncUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    job = await enqueue_sync_job(
        db,
        product_id,
        action=payload.action,
        idempotency_key=idempotency_key,
    )
    # A manual sync gets one immediate attempt; retries remain in the database queue.
    job = await process_sync_job(db, job.id)
    return SuccessResponse(data=_job_response(job))


@router.post(
    "/sync",
    response_model=SuccessResponse[list[ShopifyJobResponse]],
    status_code=status.HTTP_202_ACCEPTED,
)
async def batch_sync(
    payload: ShopifyBatchSyncRequest,
    db: DbSession,
    _: object = AdminSyncUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    jobs = []
    for product_id in payload.product_ids:
        item_key = f"{idempotency_key}:{product_id}" if idempotency_key else None
        jobs.append(await enqueue_sync_job(db, product_id, idempotency_key=item_key))
    return SuccessResponse(data=[_job_response(job) for job in jobs])


@router.get(
    "/products/{product_id}/status",
    response_model=SuccessResponse[ShopifySyncStatusResponse],
)
async def sync_status(product_id: uuid.UUID, db: DbSession, _: object = AdminSyncUser):
    mapping, jobs, logs = await get_sync_status(db, product_id)
    if mapping is None and not jobs and not logs:
        raise HTTPException(status_code=404, detail="Product Shopify sync status not found")
    return SuccessResponse(
        data=ShopifySyncStatusResponse(
            product_id=product_id,
            mapping=ShopifyMappingResponse.model_validate(mapping) if mapping else None,
            jobs=[_job_response(job) for job in jobs],
            logs=[SyncLogResponse.model_validate(log) for log in logs],
        )
    )


@router.get(
    "/products/{product_id}/logs",
    response_model=SuccessResponse[list[SyncLogResponse]],
)
async def sync_logs(product_id: uuid.UUID, db: DbSession, _: object = AdminSyncUser):
    _, _, logs = await get_sync_status(db, product_id)
    return SuccessResponse(data=[SyncLogResponse.model_validate(log) for log in logs])


@router.post(
    "/jobs/{job_id}/retry",
    response_model=SuccessResponse[ShopifyJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_job(job_id: uuid.UUID, db: DbSession, _: object = AdminSyncUser):
    job = await db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Shopify sync job not found")
    if job.status != "failed":
        raise HTTPException(status_code=409, detail="Only failed jobs can be retried")
    if job.attempts >= job.max_attempts:
        raise HTTPException(status_code=409, detail="Shopify sync retry limit reached")
    job.status = "pending"
    job.available_at = job.updated_at
    job.last_error = None
    await db.commit()
    job = await process_sync_job(db, job.id)
    return SuccessResponse(data=_job_response(job))


@router.post(
    "/jobs/{job_id}/process",
    response_model=SuccessResponse[ShopifyJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def process_job(job_id: uuid.UUID, db: DbSession, _: object = AdminSyncUser):
    return SuccessResponse(data=_job_response(await process_sync_job(db, job_id)))
