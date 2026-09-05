import uuid

from pydantic import BaseModel


class PublicImage(BaseModel):
    image_url: str
    image_type: str
    sort_order: int
    alt_text_en: str | None
    alt_text_zh: str | None


class PublicIngredient(BaseModel):
    inci_name: str
    common_name_en: str | None
    common_name_zh: str | None
    is_key_ingredient: bool


class PublicProductResponse(BaseModel):
    id: uuid.UUID
    product_code: str
    product_name_en: str
    product_name_zh: str | None
    brand_name: str
    product_type_en: str
    product_type_zh: str | None
    country_of_origin: str | None
    description_en: str | None
    description_zh: str | None
    how_to_use_en: str | None
    how_to_use_zh: str | None
    warnings_en: str | None
    warnings_zh: str | None
    skin_types: list[str]
    skin_concerns: list[str]
    ingredients: list[PublicIngredient]
    source_inci: str | None
    images: list[PublicImage]
    shopify_handle: str | None
    shopify_url: str | None
