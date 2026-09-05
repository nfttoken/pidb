import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ShopifyJobStatus = Literal["pending", "processing", "succeeded", "failed"]


class ShopifySyncRequest(BaseModel):
    action: Literal["sync", "unpublish"] = "sync"


class ShopifyBatchSyncRequest(BaseModel):
    product_ids: list[uuid.UUID] = Field(min_length=1, max_length=100)


class ShopifyJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_type: str
    product_id: uuid.UUID
    status: ShopifyJobStatus
    attempts: int
    max_attempts: int
    available_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    last_error: str | None
    idempotency_key: str


class ShopifyMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: uuid.UUID
    shopify_product_id: str | None
    shopify_handle: str | None
    sync_status: str
    last_sync_at: datetime | None
    last_sync_hash: str | None
    last_error: str | None


class SyncLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    shopify_product_id: str | None
    action: str
    attempt: int
    status: str
    error_code: str | None
    error_message: str | None
    started_at: datetime
    completed_at: datetime | None


class ShopifySyncStatusResponse(BaseModel):
    product_id: uuid.UUID
    mapping: ShopifyMappingResponse | None
    jobs: list[ShopifyJobResponse]
    logs: list[SyncLogResponse]
