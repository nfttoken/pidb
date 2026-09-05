import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.catalog import Product, ProductIngredient
from app.schemas.public import PublicImage, PublicIngredient, PublicProductResponse


async def get_public_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.product_type),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
            selectinload(Product.images),
            selectinload(Product.canada),
            selectinload(Product.shopify_mapping),
        )
        .where(
            Product.id == product_id,
            Product.status.in_(["published", "active"]),
        )
    )
    product = result.scalar_one_or_none()
    if product is None or product.canada is None or product.canada.compliance_status != "approved":
        return None
    return product


def to_public_product(product: Product) -> PublicProductResponse:
    return PublicProductResponse(
        id=product.id,
        product_code=product.product_code,
        product_name_en=product.product_name_en,
        product_name_zh=product.product_name_zh,
        brand_name=product.brand.name,
        product_type_en=product.product_type.name_en,
        product_type_zh=product.product_type.name_zh,
        country_of_origin=product.country_of_origin,
        description_en=product.description_en,
        description_zh=product.description_zh,
        how_to_use_en=product.how_to_use_en,
        how_to_use_zh=product.how_to_use_zh,
        warnings_en=product.warnings_en,
        warnings_zh=product.warnings_zh,
        skin_types=[item.code for item in product.skin_types],
        skin_concerns=[item.code for item in product.skin_concerns],
        ingredients=[
            PublicIngredient(
                inci_name=link.ingredient.inci_name,
                common_name_en=link.ingredient.common_name_en,
                common_name_zh=link.ingredient.common_name_zh,
                is_key_ingredient=link.is_key_ingredient,
            )
            for link in product.ingredients
        ],
        source_inci=product.source_inci,
        images=[
            PublicImage(
                image_url=image.image_url,
                image_type=image.image_type,
                sort_order=image.sort_order,
                alt_text_en=image.alt_text_en,
                alt_text_zh=image.alt_text_zh,
            )
            for image in sorted(product.images, key=lambda item: (item.sort_order, str(item.id)))
            if image.status == "active"
        ],
        shopify_handle=product.shopify_mapping.shopify_handle if product.shopify_mapping else None,
        shopify_url=(
            f"{settings.shopify_storefront_url.rstrip('/')}/products/{product.shopify_mapping.shopify_handle}"
            if settings.shopify_storefront_url and product.shopify_mapping and product.shopify_mapping.shopify_handle
            else None
        ),
    )
