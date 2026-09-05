import uuid

from pydantic import BaseModel, ConfigDict, Field


class ProductClaimCreate(BaseModel):
    claim_type: str = Field(default="cosmetic", min_length=1, max_length=50)
    claim_text_en: str = Field(min_length=1)
    claim_text_zh: str | None = None
    sort_order: int = Field(default=0, ge=0)


class ProductClaimResponse(ProductClaimCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    status: str
