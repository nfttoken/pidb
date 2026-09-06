import hashlib
import json
import re
import unicodedata
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.catalog import Product, ProductIngredient, ProductSku
from app.models.shopify import Job, ShopifyMapping, SyncLog
from app.services.review import calculate_readiness
from app.services.shopify_client import ShopifyApiError, ShopifyClient


SHOPIFY_JOB_TYPE = "shopify_product_sync"
RETRY_DELAYS_SECONDS = (30, 120, 600)


class ShopifySyncBlocked(RuntimeError):
    def __init__(self, message: str, *, code: str):
        super().__init__(message)
        self.code = code


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    result = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return result


def _product_status(product: Product) -> str:
    return "active" if product.status in {"published", "active"} else "draft"


def build_product_payload(product: Product, *, action: str = "sync") -> dict[str, Any]:
    """Build the Shopify native product payload without commerce-owned fields."""
    if action == "unpublish":
        return {"status": "draft"}

    handle = _slugify(f"{product.brand.slug}-{product.product_name_en}")
    if not handle:
        handle = _slugify(product.product_code) or str(product.id)
    variants = [
        {
            "sku": sku.sku,
            "barcode": sku.barcode,
            "title": sku.variant_name_en or "Default",
            "option1": sku.variant_name_en or "Default",
        }
        for sku in sorted(product.skus, key=lambda item: item.sku)
    ]
    if not variants:
        variants = [{"title": "Default", "option1": "Default"}]
    images = [
        {
            "src": image.image_url,
            "alt": image.alt_text_en or product.product_name_en,
            "position": image.sort_order + 1,
        }
        for image in sorted(product.images, key=lambda item: (item.sort_order, str(item.id)))
        if image.status == "active"
    ]
    payload: dict[str, Any] = {
        "title": product.product_name_en,
        "body_html": product.description_en or "",
        "vendor": product.brand.name,
        "product_type": product.product_type.name_en,
        "handle": handle,
        "status": _product_status(product),
        "variants": variants,
    }
    if images:
        payload["images"] = images
    return payload


def build_metafields(product: Product) -> list[dict[str, Any]]:
    skin_types = [item.code for item in product.skin_types]
    skin_concerns = [item.code for item in product.skin_concerns]
    key_links = [link for link in product.ingredients if link.is_key_ingredient]
    ingredient_links = key_links or product.ingredients
    key_ingredients = [link.ingredient.inci_name for link in ingredient_links]
    qr_codes = [qr.short_code for qr in product.qrs if qr.status == "active"]

    values: list[tuple[str, str, str, str]] = [
        ("product_type", "single_line_text_field", product.product_type.name_en, "single"),
        ("skin_types", "list.single_line_text_field", json.dumps(skin_types), "list"),
        ("skin_concerns", "list.single_line_text_field", json.dumps(skin_concerns), "list"),
        ("key_ingredients", "list.single_line_text_field", json.dumps(key_ingredients), "list"),
        ("ingredients_inci", "multi_line_text_field", product.source_inci or "", "single"),
        ("how_to_use_en", "multi_line_text_field", product.how_to_use_en or "", "single"),
        ("how_to_use_zh", "multi_line_text_field", product.how_to_use_zh or "", "single"),
        ("warnings_en", "multi_line_text_field", product.warnings_en or "", "single"),
        ("warnings_zh", "multi_line_text_field", product.warnings_zh or "", "single"),
        ("country_of_origin", "single_line_text_field", product.country_of_origin or "", "single"),
        ("pidb_product_id", "single_line_text_field", str(product.id), "single"),
        ("qr_short_code", "single_line_text_field", qr_codes[0] if qr_codes else "", "single"),
    ]
    return [
        {"namespace": "custom", "key": key, "type": field_type, "value": value}
        for key, field_type, value, _ in values
        if value or key in {"skin_types", "skin_concerns", "key_ingredients"}
    ]


def content_hash(product: Product) -> str:
    payload = {
        "product": build_product_payload(product),
        "metafields": build_metafields(product),
        "skus": [sku.sku for sku in sorted(product.skus, key=lambda item: item.sku)],
    }
    encoded = json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _update_payload(product: Product, mapping: ShopifyMapping) -> dict[str, Any]:
    payload = build_product_payload(product)
    known_variants = mapping.shopify_variant_ids or {}
    for variant in payload.get("variants", []):
        variant_id = known_variants.get(str(variant.get("sku")))
        if variant_id:
            variant["id"] = variant_id
    return payload


async def _load_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.product_type),
            selectinload(Product.skus),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
            selectinload(Product.images),
            selectinload(Product.qrs),
            selectinload(Product.canada),
            selectinload(Product.shopify_mapping),
        )
        .where(Product.id == product_id)
    )
    return result.scalar_one_or_none()


async def enqueue_sync_job(
    db: AsyncSession,
    product_id: uuid.UUID,
    *,
    action: str = "sync",
    idempotency_key: str | None = None,
) -> Job:
    if await db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if idempotency_key:
        existing = await db.scalar(select(Job).where(Job.idempotency_key == idempotency_key))
        if existing is not None:
            return existing
    else:
        pending_jobs = (
            await db.execute(
                select(Job).where(
                    Job.product_id == product_id,
                    Job.job_type == SHOPIFY_JOB_TYPE,
                    Job.status.in_(["pending", "processing"]),
                )
            )
        ).scalars().all()
        for existing in pending_jobs:
            if existing.payload.get("action") == action:
                return existing
        idempotency_key = f"shopify:{product_id}:{action}:{uuid.uuid4()}"

    job = Job(
        job_type=SHOPIFY_JOB_TYPE,
        product_id=product_id,
        status="pending",
        max_attempts=settings.shopify_max_attempts,
        available_at=datetime.now(UTC),
        idempotency_key=idempotency_key,
        payload={"action": action},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _ensure_mapping(db: AsyncSession, product_id: uuid.UUID) -> ShopifyMapping:
    mapping = await db.scalar(select(ShopifyMapping).where(ShopifyMapping.product_id == product_id))
    if mapping is None:
        mapping = ShopifyMapping(product_id=product_id, sync_status="pending")
        db.add(mapping)
        await db.flush()
    return mapping


def _validate_product(product: Product) -> None:
    if product.status not in {"ready", "published", "active"}:
        raise ShopifySyncBlocked(
            "Product status must be ready, published, or active before Shopify sync",
            code="PRODUCT_NOT_READY",
        )
    readiness = calculate_readiness(product)
    if not readiness.ready:
        raise ShopifySyncBlocked(
            "Product must pass all readiness checks before Shopify sync",
            code="PRODUCT_NOT_READY",
        )
    if not product.skus:
        raise ShopifySyncBlocked("Product must have at least one SKU", code="PRODUCT_NOT_READY")
    if not product.canada or product.canada.compliance_status != "approved":
        raise ShopifySyncBlocked(
            "Canada compliance must be approved before Shopify sync",
            code="COMPLIANCE_NOT_APPROVED",
        )


def _approved_price_updates(product: Product, mapping: ShopifyMapping) -> list[tuple[str, ProductSku, str]]:
    if not mapping.shopify_product_id:
        raise ShopifySyncBlocked("Product has no Shopify mapping", code="SHOPIFY_MAPPING_NOT_FOUND")
    variant_ids = mapping.shopify_variant_ids or {}
    approved = [sku for sku in product.skus if sku.suggested_price_status == "approved"]
    if not approved:
        raise ShopifySyncBlocked("No approved price suggestions to sync", code="PRICE_NOT_APPROVED")
    updates: list[tuple[str, ProductSku, str]] = []
    for sku in approved:
        if sku.suggested_price is None:
            raise ShopifySyncBlocked(f"SKU {sku.sku} has no suggested price", code="PRICE_NOT_APPROVED")
        variant_id = variant_ids.get(str(sku.sku))
        if not variant_id:
            raise ShopifySyncBlocked(f"SKU {sku.sku} has no Shopify variant mapping", code="SHOPIFY_VARIANT_NOT_FOUND")
        updates.append((str(variant_id), sku, format(sku.suggested_price, ".2f")))
    return updates


async def _sync_metafields(client: Any, product_id: str, product: Product) -> None:
    existing = {
        (item.get("namespace"), item.get("key")): item
        for item in await client.list_metafields(product_id)
    }
    for field in build_metafields(product):
        current = existing.get((field["namespace"], field["key"]))
        if current and current.get("id"):
            await client.update_metafield(str(current["id"]), field)
        else:
            await client.create_metafield(product_id, field)


async def _sync_images(client: Any, product_id: str, product: Product) -> None:
    existing = {item.get("src"): item for item in await client.list_images(product_id) if item.get("src")}
    for image in sorted(product.images, key=lambda item: (item.sort_order, str(item.id))):
        if image.status != "active":
            continue
        payload = {
            "src": image.image_url,
            "alt": image.alt_text_en or product.product_name_en,
            "position": image.sort_order + 1,
        }
        current = existing.get(image.image_url)
        if current and current.get("id"):
            await client.update_image(product_id, str(current["id"]), payload)
        else:
            await client.create_image(product_id, payload)


async def _record_log(
    db: AsyncSession,
    *,
    product_id: uuid.UUID,
    action: str,
    attempt: int,
    status_value: str,
    started_at: datetime,
    completed_at: datetime | None = None,
    shopify_product_id: str | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> SyncLog:
    log = SyncLog(
        product_id=product_id,
        shopify_product_id=shopify_product_id,
        action=action,
        attempt=attempt,
        status=status_value,
        error_code=error_code,
        error_message=error_message,
        started_at=started_at,
        completed_at=completed_at,
    )
    db.add(log)
    return log


async def process_sync_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    *,
    client: Any | None = None,
) -> Job:
    job = await db.scalar(select(Job).where(Job.id == job_id).with_for_update())
    if job is None:
        raise HTTPException(status_code=404, detail="Shopify sync job not found")
    if job.status == "succeeded":
        return job
    if job.status not in {"pending", "failed"}:
        return job
    if job.status == "failed" and job.attempts >= job.max_attempts:
        return job

    now = datetime.now(UTC)
    job.status = "processing"
    job.attempts += 1
    job.started_at = now
    await db.commit()

    product = await _load_product(db, job.product_id)
    action = job.payload.get("action", "sync")
    mapping = await _ensure_mapping(db, job.product_id)
    sync_hash = content_hash(product) if product is not None else None
    log_status = "failed"
    started_at = now
    shopify_product_id = mapping.shopify_product_id
    owned_client = False

    try:
        if product is None:
            raise ShopifySyncBlocked("Product not found", code="RESOURCE_NOT_FOUND")
        if action not in {"sync", "unpublish", "sync_price"}:
            raise ShopifySyncBlocked(f"Unsupported Shopify action: {action}", code="VALIDATION_ERROR")
        if action in {"sync", "sync_price"}:
            _validate_product(product)
        if action == "sync_price":
            price_updates = _approved_price_updates(product, mapping)
        else:
            price_updates = []
        if action == "sync":
            if (
                mapping.shopify_product_id
                and mapping.sync_status == "success"
                and mapping.last_sync_hash == sync_hash
            ):
                log_status = "skipped"
                job.status = "succeeded"
                job.completed_at = datetime.now(UTC)
                await _record_log(
                    db,
                    product_id=product.id,
                    action="skip",
                    attempt=job.attempts,
                    status_value=log_status,
                    started_at=started_at,
                    completed_at=job.completed_at,
                    shopify_product_id=mapping.shopify_product_id,
                )
                await db.commit()
                return job
        elif not mapping.shopify_product_id:
            raise ShopifySyncBlocked("Product has no Shopify mapping", code="SHOPIFY_MAPPING_NOT_FOUND")

        if client is None:
            client = ShopifyClient()
            owned_client = True

        if action == "unpublish":
            response_product = await client.update_product(mapping.shopify_product_id, {"status": "draft"})
        elif action == "sync_price":
            for variant_id, _, price in price_updates:
                await client.update_variant(variant_id, {"price": price})
            response_product = {"id": mapping.shopify_product_id}
        elif mapping.shopify_product_id:
            response_product = await client.update_product(
                mapping.shopify_product_id, _update_payload(product, mapping)
            )
            await _sync_metafields(client, mapping.shopify_product_id, product)
            await _sync_images(client, mapping.shopify_product_id, product)
        else:
            response_product = await client.create_product(build_product_payload(product))
            shopify_product_id = str(response_product.get("id") or "") or None
            if not shopify_product_id:
                raise ShopifyApiError(
                    "Shopify create response did not include a product ID",
                    code="SHOPIFY_INVALID_RESPONSE",
                )
            await _sync_metafields(client, shopify_product_id, product)
            await _sync_images(client, shopify_product_id, product)

        if action == "sync":
            shopify_product_id = str(response_product.get("id") or shopify_product_id or "") or None
            mapping.shopify_product_id = shopify_product_id
            mapping.shopify_handle = response_product.get("handle") or build_product_payload(product).get("handle")
            mapping.last_sync_hash = sync_hash
            mapping.last_sync_at = datetime.now(UTC)
            mapping.last_error = None
            mapping.sync_status = "success"
            variant_ids = {
                str(variant.get("sku")): str(variant.get("id"))
                for variant in response_product.get("variants", [])
                if variant.get("sku") and variant.get("id")
            }
            if variant_ids:
                mapping.shopify_variant_ids = variant_ids
        else:
            mapping.sync_status = "success"
            mapping.last_error = None

        log_status = "success"
        job.status = "succeeded"
        job.completed_at = datetime.now(UTC)
        await _record_log(
            db,
            product_id=product.id,
            action=action,
            attempt=job.attempts,
            status_value=log_status,
            started_at=started_at,
            completed_at=job.completed_at,
            shopify_product_id=shopify_product_id,
        )
    except ShopifySyncBlocked as exc:
        mapping.sync_status = "blocked"
        mapping.last_error = str(exc)
        job.status = "failed"
        job.last_error = str(exc)
        job.completed_at = datetime.now(UTC)
        await _record_log(
            db,
            product_id=job.product_id,
            action=action,
            attempt=job.attempts,
            status_value="blocked",
            started_at=started_at,
            completed_at=job.completed_at,
            shopify_product_id=shopify_product_id,
            error_code=exc.code,
            error_message=str(exc),
        )
    except ShopifyApiError as exc:
        retryable = exc.retryable and job.attempts < job.max_attempts
        mapping.sync_status = "pending" if retryable else "failed"
        mapping.last_error = str(exc)
        job.status = "pending" if retryable else "failed"
        job.last_error = str(exc)
        job.completed_at = None if retryable else datetime.now(UTC)
        if retryable:
            delay_index = min(job.attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)
            job.available_at = datetime.now(UTC) + timedelta(seconds=RETRY_DELAYS_SECONDS[delay_index])
        await _record_log(
            db,
            product_id=job.product_id,
            action=action,
            attempt=job.attempts,
            status_value="retry_scheduled" if retryable else "failed",
            started_at=started_at,
            completed_at=datetime.now(UTC),
            shopify_product_id=shopify_product_id,
            error_code=exc.code,
            error_message=str(exc),
        )
    except Exception as exc:
        mapping.sync_status = "failed"
        mapping.last_error = str(exc)
        job.status = "failed"
        job.last_error = str(exc)
        job.completed_at = datetime.now(UTC)
        await _record_log(
            db,
            product_id=job.product_id,
            action=action,
            attempt=job.attempts,
            status_value="failed",
            started_at=started_at,
            completed_at=job.completed_at,
            shopify_product_id=shopify_product_id,
            error_code="SHOPIFY_SYNC_FAILED",
            error_message=str(exc),
        )
    finally:
        if owned_client and client is not None:
            await client.close()

    await db.commit()
    return job


async def get_sync_status(
    db: AsyncSession, product_id: uuid.UUID
) -> tuple[ShopifyMapping | None, list[Job], list[SyncLog]]:
    mapping = await db.scalar(select(ShopifyMapping).where(ShopifyMapping.product_id == product_id))
    jobs = list(
        (
            await db.execute(
                select(Job)
                .where(Job.product_id == product_id, Job.job_type == SHOPIFY_JOB_TYPE)
                .order_by(Job.created_at.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )
    logs = list(
        (
            await db.execute(
                select(SyncLog)
                .where(SyncLog.product_id == product_id)
                .order_by(SyncLog.started_at.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )
    return mapping, jobs, logs
