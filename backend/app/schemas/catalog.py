import uuid

from pydantic import BaseModel, ConfigDict, Field


class CatalogBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str


class BrandCreate(BaseModel):
    brand_code: str | None = Field(default=None, max_length=80)
    name: str = Field(min_length=1, max_length=255)
    name_ko: str | None = None
    name_ja: str | None = None
    name_en: str | None = None
    name_zh: str | None = None
    slug: str = Field(min_length=1, max_length=180)
    country_of_origin: str | None = Field(default=None, min_length=2, max_length=2)
    website_url: str | None = None
    description_en: str | None = None
    description_zh: str | None = None
    logo_url: str | None = None


class BrandResponse(BrandCreate, CatalogBase):
    pass


class ProductTypeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name_en: str = Field(min_length=1, max_length=150)
    name_zh: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int = 0


class ProductTypeResponse(ProductTypeCreate, CatalogBase):
    pass


class TaxonomyCreate(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name_en: str = Field(min_length=1, max_length=150)
    name_zh: str | None = None


class TaxonomyResponse(TaxonomyCreate, CatalogBase):
    pass


class IngredientCreate(BaseModel):
    inci_name: str = Field(min_length=1, max_length=255)
    common_name_en: str | None = None
    common_name_zh: str | None = None
    common_name_ko: str | None = None
    common_name_ja: str | None = None
    description_en: str | None = None
    description_zh: str | None = None
    cosmetic_functions: str | None = None
    search_keywords: str | None = None


class IngredientResponse(IngredientCreate, CatalogBase):
    pass
