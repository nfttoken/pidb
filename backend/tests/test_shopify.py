import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from app.core.config import settings
from app.services.shopify import _approved_price_updates, build_metafields, build_product_payload
from app.services.shopify_client import ShopifyApiError, ShopifyClient


def _product():
    ingredient = SimpleNamespace(inci_name="Niacinamide", common_name_en="Niacinamide")
    return SimpleNamespace(
        id=uuid4(),
        product_code="KR-SERUM-001",
        status="published",
        product_name_en="Hydrating Serum",
        product_name_zh="补水精华",
        description_en="A lightweight serum",
        how_to_use_en="Apply daily",
        how_to_use_zh="每日使用",
        warnings_en="For external use",
        warnings_zh="仅供外用",
        country_of_origin="KR",
        source_inci="Water, Niacinamide",
        brand=SimpleNamespace(name="Example Brand", slug="example-brand"),
        product_type=SimpleNamespace(name_en="Serum"),
        skus=[SimpleNamespace(sku="KR-SERUM-001", barcode="880000000001", variant_name_en=None)],
        skin_types=[SimpleNamespace(code="dry")],
        skin_concerns=[SimpleNamespace(code="hydration")],
        ingredients=[SimpleNamespace(is_key_ingredient=True, ingredient=ingredient)],
        images=[
            SimpleNamespace(
                id=uuid4(),
                image_url="https://cdn.example.com/serum.jpg",
                alt_text_en="Hydrating serum",
                sort_order=0,
                status="active",
            )
        ],
        qrs=[SimpleNamespace(short_code="A8K29", status="active")],
    )


def test_shopify_payload_excludes_commerce_owned_fields() -> None:
    payload = build_product_payload(_product())

    assert payload["title"] == "Hydrating Serum"
    assert payload["status"] == "active"
    assert payload["variants"][0]["sku"] == "KR-SERUM-001"
    assert "price" not in payload
    assert "inventory_quantity" not in payload
    assert {item["key"] for item in build_metafields(_product())} >= {
        "skin_types",
        "skin_concerns",
        "key_ingredients",
        "pidb_product_id",
        "qr_short_code",
    }


@pytest.mark.asyncio
async def test_shopify_rest_client_uses_admin_api_and_parses_product() -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.headers["X-Shopify-Access-Token"] == "test-token"
        if request.method == "POST" and request.url.path.endswith("/products.json"):
            body = json.loads(request.content)
            assert "price" not in body["product"]["variants"][0]
            return httpx.Response(
                201,
                json={"product": {"id": 123, "handle": "hydrating-serum"}},
            )
        return httpx.Response(200, json={})

    previous_domain = settings.shopify_store_domain
    previous_token = settings.shopify_admin_access_token
    settings.shopify_store_domain = "example.myshopify.com"
    settings.shopify_admin_access_token = "test-token"
    client = ShopifyClient(client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    try:
        product = await client.create_product(build_product_payload(_product()))
    finally:
        await client.close()
        settings.shopify_store_domain = previous_domain
        settings.shopify_admin_access_token = previous_token

    assert product == {"id": 123, "handle": "hydrating-serum"}
    assert requests[0].url.path.endswith("/admin/api/2025-01/products.json")


@pytest.mark.asyncio
async def test_shopify_network_errors_are_retryable() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("temporary timeout")

    previous_domain = settings.shopify_store_domain
    previous_token = settings.shopify_admin_access_token
    settings.shopify_store_domain = "example.myshopify.com"
    settings.shopify_admin_access_token = "test-token"
    client = ShopifyClient(client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    try:
        with pytest.raises(ShopifyApiError) as error:
            await client.create_product({"title": "Test"})
    finally:
        await client.close()
        settings.shopify_store_domain = previous_domain
        settings.shopify_admin_access_token = previous_token

    assert error.value.code == "SHOPIFY_NETWORK_ERROR"
    assert error.value.retryable


def test_shopify_api_error_marks_rate_limit_retryable() -> None:
    assert ShopifyApiError("rate limited", code="SHOPIFY_API_ERROR", status_code=429).retryable
    assert not ShopifyApiError("invalid sku", code="SHOPIFY_API_ERROR", status_code=422).retryable


def test_approved_price_updates_only_returns_approved_variants() -> None:
    product = SimpleNamespace(
        skus=[
            SimpleNamespace(sku="SKU-1", suggested_price=19.99, suggested_price_status="approved"),
            SimpleNamespace(sku="SKU-2", suggested_price=24.99, suggested_price_status="pending"),
        ]
    )
    mapping = SimpleNamespace(shopify_product_id="123", shopify_variant_ids={"SKU-1": "456"})

    updates = _approved_price_updates(product, mapping)

    assert [(variant_id, price) for variant_id, _, price in updates] == [("456", "19.99")]


@pytest.mark.asyncio
async def test_shopify_rest_client_updates_variant_price_only() -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"variant": {"id": 456, "price": "19.99"}})

    previous_domain = settings.shopify_store_domain
    previous_token = settings.shopify_admin_access_token
    settings.shopify_store_domain = "example.myshopify.com"
    settings.shopify_admin_access_token = "test-token"
    client = ShopifyClient(client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    try:
        variant = await client.update_variant("456", {"price": "19.99"})
    finally:
        await client.close()
        settings.shopify_store_domain = previous_domain
        settings.shopify_admin_access_token = previous_token

    assert variant == {"id": 456, "price": "19.99"}
    assert requests[0].method == "PUT"
    assert requests[0].url.path.endswith("/admin/api/2025-01/variants/456.json")
    body = json.loads(requests[0].content)
    assert body == {"variant": {"id": "456", "price": "19.99"}}
