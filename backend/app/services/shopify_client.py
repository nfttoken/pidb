from collections.abc import Mapping
from typing import Any

import httpx

from app.core.config import settings


class ShopifyApiError(RuntimeError):
    def __init__(self, message: str, *, code: str, status_code: int | None = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code

    @property
    def retryable(self) -> bool:
        return self.code == "SHOPIFY_NETWORK_ERROR" or self.status_code in {408, 409, 425, 429} or bool(
            self.status_code and self.status_code >= 500
        )


class ShopifyClient:
    """Small REST client for the Shopify Admin API.

    The normal product payload deliberately excludes price and inventory fields.
    Price changes are exposed only through the explicit variant update operation.
    """

    def __init__(self, client: httpx.AsyncClient | None = None):
        if not settings.shopify_store_domain or not settings.shopify_admin_access_token:
            raise ShopifyApiError(
                "Shopify integration is not configured",
                code="SHOPIFY_NOT_CONFIGURED",
            )
        domain = settings.shopify_store_domain.strip().rstrip("/")
        if not domain.startswith(("http://", "https://")):
            domain = f"https://{domain}"
        self.base_url = (
            f"{domain}/admin/api/{settings.shopify_api_version.strip('/') }"
        )
        headers = {
            "X-Shopify-Access-Token": settings.shopify_admin_access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self._client = client or httpx.AsyncClient(
            timeout=settings.shopify_timeout_seconds,
            headers=headers,
        )
        if client is not None:
            self._client.headers.update(headers)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _request(
        self, method: str, path: str, *, json: Mapping[str, Any] | None = None
    ) -> dict[str, Any]:
        try:
            response = await self._client.request(method, f"{self.base_url}/{path.lstrip('/')}", json=json)
        except httpx.RequestError as exc:
            raise ShopifyApiError(str(exc), code="SHOPIFY_NETWORK_ERROR") from exc
        if response.is_error:
            try:
                body = response.json()
            except ValueError:
                body = response.text
            message = body.get("errors", body) if isinstance(body, dict) else body
            raise ShopifyApiError(
                str(message),
                code="SHOPIFY_API_ERROR",
                status_code=response.status_code,
            )
        if not response.content:
            return {}
        try:
            data = response.json()
        except ValueError as exc:
            raise ShopifyApiError("Shopify returned invalid JSON", code="SHOPIFY_INVALID_RESPONSE") from exc
        return data if isinstance(data, dict) else {}

    async def create_product(self, payload: dict[str, Any]) -> dict[str, Any]:
        return (await self._request("POST", "/products.json", json={"product": payload})).get(
            "product", {}
        )

    async def update_product(self, product_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {"id": product_id, **payload}
        return (await self._request("PUT", f"/products/{product_id}.json", json={"product": body})).get(
            "product", {}
        )

    async def update_variant(self, variant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {"id": variant_id, **payload}
        return (await self._request("PUT", f"/variants/{variant_id}.json", json={"variant": body})).get(
            "variant", {}
        )

    async def list_metafields(self, product_id: str) -> list[dict[str, Any]]:
        return (await self._request("GET", f"/products/{product_id}/metafields.json")).get(
            "metafields", []
        )

    async def create_metafield(self, product_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return (
            await self._request(
                "POST", f"/products/{product_id}/metafields.json", json={"metafield": payload}
            )
        ).get("metafield", {})

    async def update_metafield(self, metafield_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {"id": metafield_id, **payload}
        return (await self._request("PUT", f"/metafields/{metafield_id}.json", json={"metafield": body})).get(
            "metafield", {}
        )

    async def list_images(self, product_id: str) -> list[dict[str, Any]]:
        return (await self._request("GET", f"/products/{product_id}/images.json")).get("images", [])

    async def create_image(self, product_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return (await self._request("POST", f"/products/{product_id}/images.json", json={"image": payload})).get(
            "image", {}
        )

    async def update_image(self, product_id: str, image_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {"id": image_id, **payload}
        return (await self._request("PUT", f"/products/{product_id}/images/{image_id}.json", json={"image": body})).get(
            "image", {}
        )
