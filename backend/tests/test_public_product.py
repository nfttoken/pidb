from types import SimpleNamespace
from uuid import uuid4

from app.core.config import settings
from app.services.public import to_public_product


def test_public_product_dto_contains_consumer_fields_only() -> None:
    previous_storefront = settings.shopify_storefront_url
    settings.shopify_storefront_url = "https://shop.example.ca"
    product = SimpleNamespace(
        id=uuid4(),
        product_code="KR-SERUM-001",
        product_name_en="Hydrating Serum",
        product_name_zh="补水精华",
        country_of_origin="KR",
        description_en="Hydrating serum",
        description_zh="补水精华",
        how_to_use_en="Apply daily",
        how_to_use_zh="每日使用",
        warnings_en="For external use",
        warnings_zh="仅供外用",
        source_inci="Water, Niacinamide",
        brand=SimpleNamespace(name="Example Brand"),
        product_type=SimpleNamespace(name_en="Serum", name_zh="精华"),
        skin_types=[SimpleNamespace(code="dry")],
        skin_concerns=[SimpleNamespace(code="hydration")],
        ingredients=[
            SimpleNamespace(
                is_key_ingredient=True,
                ingredient=SimpleNamespace(
                    inci_name="Niacinamide",
                    common_name_en="Niacinamide",
                    common_name_zh="烟酰胺",
                ),
            )
        ],
        images=[],
        shopify_mapping=SimpleNamespace(shopify_handle="hydrating-serum"),
    )
    try:
        public_product = to_public_product(product)
    finally:
        settings.shopify_storefront_url = previous_storefront

    assert public_product.shopify_url == "https://shop.example.ca/products/hydrating-serum"
    assert public_product.ingredients[0].is_key_ingredient is True
    assert not hasattr(public_product, "compliance_status")
    assert not hasattr(public_product, "shopify_product_id")
