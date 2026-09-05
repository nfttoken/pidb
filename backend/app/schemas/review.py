import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ComplianceStatus = Literal["pending", "reviewing", "approved", "blocked"]


class ProductImageCreate(BaseModel):
    image_url: str = Field(min_length=1, max_length=1000)
    image_type: str = Field(default="gallery", max_length=30)
    sort_order: int = Field(default=0, ge=0)
    alt_text_en: str | None = None
    alt_text_zh: str | None = None


class ProductImageResponse(ProductImageCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    status: str


class ProductCanadaUpdate(BaseModel):
    importer_name: str | None = None
    distributor_name: str | None = None
    canadian_label_status: str = "pending"
    cosmetic_notification_status: str = "pending"
    compliance_status: ComplianceStatus = "pending"
    notes: str | None = None


class ProductCanadaResponse(ProductCanadaUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    reviewed_at: datetime | None


class ReadinessCheck(BaseModel):
    key: str
    label: str
    passed: bool
    weight: int
    detail: str | None = None


class ProductReadinessResponse(BaseModel):
    product_id: uuid.UUID
    score: int
    ready: bool
    checks: list[ReadinessCheck]
    blockers: list[str]

