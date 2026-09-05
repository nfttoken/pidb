import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import BrandResponse, IngredientResponse, ProductTypeResponse, TaxonomyResponse
from app.schemas.review import ProductCanadaResponse, ProductImageResponse
from app.schemas.claims import ProductClaimCreate, ProductClaimResponse


ProductStatus = Literal[
    "draft",
    "imported",
    "processing",
    "review",
    "ready",
    "published",
    "active",
    "inactive",
    "discontinued",
]


class SkuCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=100)
    barcode: str | None = Field(default=None, max_length=50)
    variant_name_en: str | None = None
    variant_name_zh: str | None = None
    net_quantity: float | None = Field(default=None, gt=0)
    quantity_unit: str | None = Field(default=None, max_length=20)


class SkuResponse(SkuCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    status: str


class ProductIngredientInput(BaseModel):
    ingredient_id: uuid.UUID
    position: int | None = Field(default=None, ge=1)
    is_key_ingredient: bool = False


class ProductIngredientResponse(BaseModel):
    ingredient: IngredientResponse
    position: int | None
    is_key_ingredient: bool


class ProductCreate(BaseModel):
    product_code: str = Field(min_length=1, max_length=50)
    brand_id: uuid.UUID
    product_type_id: uuid.UUID
    original_language: Literal["ko", "ja", "zh", "en", "fr", "other"]
    original_name: str = Field(min_length=1, max_length=500)
    product_name_en: str = Field(min_length=1, max_length=500)
    product_name_zh: str | None = None
    description_en: str | None = None
    description_zh: str | None = None
    how_to_use_en: str | None = None
    how_to_use_zh: str | None = None
    warnings_en: str | None = None
    warnings_zh: str | None = None
    country_of_origin: str | None = Field(default=None, min_length=2, max_length=2)
    source_inci: str | None = None
    attributes: dict = Field(default_factory=dict)
    skus: list[SkuCreate] = Field(default_factory=list)
    skin_type_ids: list[uuid.UUID] = Field(default_factory=list)
    skin_concern_ids: list[uuid.UUID] = Field(default_factory=list)
    ingredient_ids: list[uuid.UUID] = Field(default_factory=list)
    ingredients: list[ProductIngredientInput] | None = None
    claims: list[ProductClaimCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    brand_id: uuid.UUID | None = None
    product_type_id: uuid.UUID | None = None
    original_name: str | None = Field(default=None, min_length=1, max_length=500)
    product_name_en: str | None = Field(default=None, min_length=1, max_length=500)
    product_name_zh: str | None = None
    description_en: str | None = None
    description_zh: str | None = None
    how_to_use_en: str | None = None
    how_to_use_zh: str | None = None
    warnings_en: str | None = None
    warnings_zh: str | None = None
    source_inci: str | None = None
    attributes: dict | None = None
    country_of_origin: str | None = Field(default=None, min_length=2, max_length=2)
    skus: list[SkuCreate] | None = None
    skin_type_ids: list[uuid.UUID] | None = None
    skin_concern_ids: list[uuid.UUID] | None = None
    ingredient_ids: list[uuid.UUID] | None = None
    ingredients: list[ProductIngredientInput] | None = None
    claims: list[ProductClaimCreate] | None = None


class ProductStatusChange(BaseModel):
    status: ProductStatus


class ProductListItem(BaseModel):
    id: uuid.UUID
    product_code: str
    product_name_en: str
    brand_name: str
    product_type_name: str
    status: str
    compliance_status: str | None = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    product_code: str
    original_language: str
    original_name: str
    product_name_en: str
    product_name_zh: str | None
    description_en: str | None
    description_zh: str | None
    how_to_use_en: str | None
    how_to_use_zh: str | None
    warnings_en: str | None
    warnings_zh: str | None
    country_of_origin: str | None
    source_inci: str | None
    attributes: dict
    status: str
    brand: BrandResponse
    product_type: ProductTypeResponse
    skus: list[SkuResponse]
    skin_types: list[TaxonomyResponse]
    skin_concerns: list[TaxonomyResponse]
    ingredients: list[ProductIngredientResponse]
    images: list[ProductImageResponse]
    canada: ProductCanadaResponse | None
    claims: list[ProductClaimResponse]
