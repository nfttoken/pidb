import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from app.schemas.public import PublicProductResponse


class QrCreate(BaseModel):
    destination_type: str = "product"


class QrResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    short_code: str
    destination_type: str
    target_url: str
    status: str
    created_at: datetime


class QrListItem(QrResponse):
    product_code: str
    product_name_en: str
    product_status: str


class QrResolutionResponse(BaseModel):
    short_code: str
    target_url: str
    product_id: uuid.UUID
    product_code: str
    product_name_en: str
    product_name_zh: str | None
    product_status: str
    product: PublicProductResponse
