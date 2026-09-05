import csv
import io
import re
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import (
    Brand,
    Ingredient,
    Product,
    ProductClaim,
    ProductIngredient,
    ProductSku,
    ProductType,
    SkinConcern,
    SkinType,
)
from app.models.imports import ImportBatch, ImportErrorRecord
from app.models.review import ProductCanada


REQUIRED_FIELDS = (
    "product_code",
    "brand_name",
    "original_language",
    "original_name",
    "product_name_en",
    "product_name_zh",
    "product_type",
    "sku",
)
ROW_REQUIRED_FIELDS = REQUIRED_FIELDS + ("country_of_origin", "net_quantity")
LANGUAGE_ALIASES = {
    "korean": "ko",
    "한국어": "ko",
    "japanese": "ja",
    "中文": "zh",
    "chinese": "zh",
    "english": "en",
    "french": "fr",
}
LIFECYCLE_STATUSES = {
    "draft", "imported", "processing", "review", "ready", "published", "active", "inactive", "discontinued"
}
COMPLIANCE_STATUSES = {"pending", "reviewing", "approved", "blocked"}
COUNTRY_ALIASES = {
    "korea": "KR",
    "south korea": "KR",
    "japan": "JP",
    "china": "CN",
    "canada": "CA",
}


@dataclass(frozen=True)
class RowError:
    row_number: int
    field_name: str | None
    error_code: str
    message: str
    raw_value: str | None = None


def _clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _normalize_language(value: str) -> str:
    normalized = _clean(value).lower()
    return LANGUAGE_ALIASES.get(normalized, normalized)


def _normalize_country(value: str | None) -> str | None:
    normalized = _clean(value).lower()
    if not normalized:
        return None
    return COUNTRY_ALIASES.get(normalized, normalized.upper())


def _split_multi(value: str | None) -> list[str]:
    return [_clean(item) for item in (value or "").split("|") if _clean(item)]


def _ingredient_names(row: dict[str, str]) -> list[str]:
    values = _split_multi(row.get("key_ingredients")) + _split_multi(row.get("ingredient_names"))
    if not values and _clean(row.get("ingredients_inci")):
        values = [_clean(value) for value in row["ingredients_inci"].split(",") if _clean(value)]
    return list(dict.fromkeys(values))


def _claim_values(row: dict[str, str]) -> list[str]:
    return _split_multi(row.get("claims"))


def parse_csv(content: bytes) -> list[dict[str, str]]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="CSV must be UTF-8 encoded") from exc
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="CSV header is missing")
    headers = {_clean(header).lower() for header in reader.fieldnames if header}
    missing_headers = [field for field in REQUIRED_FIELDS if field not in headers]
    if missing_headers:
        raise HTTPException(status_code=422, detail={"code": "MISSING_HEADERS", "fields": missing_headers})
    return [
        {
            _clean(key).lower(): _clean(value)
            for key, value in row.items()
            if key is not None
        }
        for row in reader
    ]


async def validate_rows(db: AsyncSession, rows: list[dict[str, str]]) -> list[RowError]:
    errors: list[RowError] = []
    seen_product_codes: set[str] = set()
    seen_skus: set[str] = set()
    seen_barcodes: set[str] = set()

    for row_number, row in enumerate(rows, start=2):
        product_code = _clean(row.get("product_code"))
        sku = _clean(row.get("sku"))
        barcode = _clean(row.get("barcode"))
        for field in ROW_REQUIRED_FIELDS:
            if not _clean(row.get(field)):
                errors.append(RowError(row_number, field, "MISSING_REQUIRED_FIELD", f"{field} is required"))
        language = _normalize_language(row.get("original_language", ""))
        if language not in {"ko", "ja", "zh", "en", "fr", "other"}:
            errors.append(RowError(row_number, "original_language", "INVALID_LANGUAGE", "Unsupported language code"))
        lifecycle_status = _clean(row.get("status")).lower()
        if lifecycle_status and lifecycle_status not in LIFECYCLE_STATUSES:
            errors.append(RowError(row_number, "status", "INVALID_STATUS", "Unsupported product lifecycle status"))
        compliance_status = _clean(row.get("compliance_status")).lower()
        if compliance_status and compliance_status not in COMPLIANCE_STATUSES:
            errors.append(RowError(row_number, "compliance_status", "INVALID_COMPLIANCE_STATUS", "Unsupported compliance status"))
        quantity = _clean(row.get("net_quantity"))
        if quantity:
            try:
                if float(quantity) <= 0:
                    raise ValueError
            except ValueError:
                errors.append(RowError(row_number, "net_quantity", "INVALID_QUANTITY", "Quantity must be positive"))

        if product_code and product_code in seen_product_codes:
            errors.append(RowError(row_number, "product_code", "DUPLICATE_PRODUCT_CODE", "Duplicate product_code in file"))
        if product_code:
            seen_product_codes.add(product_code)
        if sku and sku in seen_skus:
            errors.append(RowError(row_number, "sku", "DUPLICATE_SKU", "Duplicate SKU in file"))
        if sku:
            seen_skus.add(sku)
        if barcode:
            if barcode in seen_barcodes:
                errors.append(RowError(row_number, "barcode", "DUPLICATE_BARCODE", "Duplicate barcode in file"))
            seen_barcodes.add(barcode)

        existing_product_id = await db.scalar(
            select(Product.id).where(Product.product_code == product_code)
        ) if product_code else None
        existing_sku_product_id = await db.scalar(
            select(ProductSku.product_id).where(ProductSku.sku == sku)
        ) if sku else None
        if existing_sku_product_id and existing_sku_product_id != existing_product_id:
            errors.append(RowError(row_number, "sku", "DUPLICATE_SKU", "SKU belongs to another product"))
        existing_barcode_product_id = await db.scalar(
            select(ProductSku.product_id).where(ProductSku.barcode == barcode)
        ) if barcode else None
        if existing_barcode_product_id and existing_barcode_product_id != existing_product_id:
            errors.append(RowError(row_number, "barcode", "DUPLICATE_BARCODE", "Barcode belongs to another product"))

        brand = await db.scalar(select(Brand).where(Brand.name == _clean(row.get("brand_name"))))
        if brand is None and _clean(row.get("brand_name")):
            errors.append(RowError(row_number, "brand_name", "UNKNOWN_BRAND", "Brand does not exist"))
        product_type = await db.scalar(
            select(ProductType).where(
                (ProductType.code == _clean(row.get("product_type")).upper())
                | (ProductType.name_en.ilike(_clean(row.get("product_type"))))
            )
        )
        if product_type is None and _clean(row.get("product_type")):
            errors.append(RowError(row_number, "product_type", "UNKNOWN_PRODUCT_TYPE", "Product type does not exist"))

        ingredients = (await db.execute(select(Ingredient).where(Ingredient.status == "active"))).scalars().all()
        ingredient_lookup = {
            value.lower(): ingredient
            for ingredient in ingredients
            for value in (ingredient.inci_name, ingredient.common_name_en or "", ingredient.common_name_zh or "")
            if value
        }
        for name in _ingredient_names(row):
            if name.lower() not in ingredient_lookup:
                errors.append(RowError(row_number, "ingredients_inci", "UNKNOWN_INGREDIENT", f"Ingredient does not exist: {name}", name))

    return errors


async def create_batch(db: AsyncSession, filename: str, rows: list[dict[str, str]]) -> ImportBatch:
    errors = await validate_rows(db, rows)
    batch = ImportBatch(
        filename=filename,
        status="validated",
        total_rows=len(rows),
        valid_rows=len(rows) - len({error.row_number for error in errors}),
        error_rows=len({error.row_number for error in errors}),
        rows=rows,
    )
    batch.errors = [
        ImportErrorRecord(
            row_number=error.row_number,
            field_name=error.field_name,
            error_code=error.error_code,
            message=error.message,
            raw_value=error.raw_value,
        )
        for error in errors
    ]
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch


async def get_batch(db: AsyncSession, batch_id: uuid.UUID) -> ImportBatch | None:
    result = await db.execute(
        select(ImportBatch).options(selectinload(ImportBatch.errors)).where(ImportBatch.id == batch_id)
    )
    return result.scalar_one_or_none()


async def validate_batch(db: AsyncSession, batch: ImportBatch) -> ImportBatch:
    await db.execute(delete(ImportErrorRecord).where(ImportErrorRecord.batch_id == batch.id))
    errors = await validate_rows(db, batch.rows)
    batch.status = "validated"
    batch.total_rows = len(batch.rows)
    batch.valid_rows = len(batch.rows) - len({error.row_number for error in errors})
    batch.error_rows = len({error.row_number for error in errors})
    batch.errors = [
        ImportErrorRecord(
            row_number=error.row_number,
            field_name=error.field_name,
            error_code=error.error_code,
            message=error.message,
            raw_value=error.raw_value,
        )
        for error in errors
    ]
    await db.commit()
    return batch


async def confirm_batch(db: AsyncSession, batch: ImportBatch, mode: str) -> tuple[int, int, int]:
    if batch.status not in {"validated", "confirmed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Import batch is not ready to confirm")
    invalid_rows = {error.row_number for error in batch.errors}
    created = updated = skipped = 0
    for row_number, row in enumerate(batch.rows, start=2):
        if row_number in invalid_rows:
            skipped += 1
            continue
        product_code = _clean(row["product_code"])
        product_result = await db.execute(
            select(Product)
            .options(
                selectinload(Product.skin_types),
                selectinload(Product.skin_concerns),
                selectinload(Product.ingredients),
                selectinload(Product.claims),
            )
            .where(Product.product_code == product_code)
        )
        product = product_result.scalar_one_or_none()
        if product is not None and mode == "create_only":
            skipped += 1
            continue
        if product is None and mode == "update_only":
            skipped += 1
            continue

        brand = await db.scalar(select(Brand).where(Brand.name == _clean(row["brand_name"])))
        product_type = await db.scalar(
            select(ProductType).where(
                (ProductType.code == _clean(row["product_type"]).upper())
                | (ProductType.name_en.ilike(_clean(row["product_type"])))
            )
        )
        if brand is None or product_type is None:
            skipped += 1
            continue

        values = {
            "brand_id": brand.id,
            "product_type_id": product_type.id,
            "original_language": _normalize_language(row["original_language"]),
            "original_name": _clean(row["original_name"]),
            "product_name_en": _clean(row["product_name_en"]),
            "product_name_zh": _clean(row.get("product_name_zh")),
            "description_en": _clean(row.get("description_en")) or None,
            "description_zh": _clean(row.get("description_zh")) or None,
            "how_to_use_en": _clean(row.get("how_to_use_en")) or None,
            "how_to_use_zh": _clean(row.get("how_to_use_zh")) or None,
            "warnings_en": _clean(row.get("warnings_en")) or None,
            "warnings_zh": _clean(row.get("warnings_zh")) or None,
            "country_of_origin": _normalize_country(row.get("country_of_origin")),
            "source_inci": _clean(row.get("ingredients_inci")) or None,
        }
        if product is None:
            product = Product(product_code=product_code, **values, status="imported")
            db.add(product)
            await db.flush()
            created += 1
        else:
            for field, value in values.items():
                setattr(product, field, value)
            product.status = "imported"
            updated += 1

        if "skin_types" in row:
            names = _split_multi(row.get("skin_types"))
            result = await db.execute(
                select(SkinType).where(
                    func.lower(SkinType.code).in_([name.lower() for name in names])
                    | func.lower(SkinType.name_en).in_([name.lower() for name in names])
                )
            )
            product.skin_types = list(result.scalars().all())
        if "skin_concerns" in row:
            names = _split_multi(row.get("skin_concerns"))
            result = await db.execute(
                select(SkinConcern).where(
                    func.lower(SkinConcern.code).in_([name.lower() for name in names])
                    | func.lower(SkinConcern.name_en).in_([name.lower() for name in names])
                )
            )
            product.skin_concerns = list(result.scalars().all())

        ingredient_names = _ingredient_names(row)
        if ingredient_names:
            all_ingredients = (await db.execute(select(Ingredient).where(Ingredient.status == "active"))).scalars().all()
            lookup = {
                value.lower(): ingredient
                for ingredient in all_ingredients
                for value in (ingredient.inci_name, ingredient.common_name_en or "", ingredient.common_name_zh or "")
                if value
            }
            key_names = {name.lower() for name in _split_multi(row.get("key_ingredients"))}
            product.ingredients = [
                ProductIngredient(
                    ingredient=lookup[name.lower()],
                    position=position,
                    is_key_ingredient=name.lower() in key_names,
                )
                for position, name in enumerate(ingredient_names, start=1)
            ]
        if "claims" in row:
            product.claims = [
                ProductClaim(claim_type="cosmetic", claim_text_en=claim)
                for claim in _claim_values(row)
            ]
        if any(key in row for key in ("importer_name", "distributor_name", "compliance_status", "canadian_label_status", "cosmetic_notification_status", "compliance_notes")):
            canada = await db.scalar(select(ProductCanada).where(ProductCanada.product_id == product.id))
            if canada is None:
                canada = ProductCanada(product_id=product.id)
                db.add(canada)
            canada.importer_name = _clean(row.get("importer_name")) or None
            canada.distributor_name = _clean(row.get("distributor_name")) or None
            canada.compliance_status = _clean(row.get("compliance_status")) or canada.compliance_status
            canada.canadian_label_status = _clean(row.get("canadian_label_status")) or canada.canadian_label_status
            canada.cosmetic_notification_status = _clean(row.get("cosmetic_notification_status")) or canada.cosmetic_notification_status
            canada.notes = _clean(row.get("compliance_notes")) or None

        sku = await db.scalar(select(ProductSku).where(ProductSku.sku == _clean(row["sku"])))
        if sku is None:
            db.add(
                ProductSku(
                    product_id=product.id,
                    sku=_clean(row["sku"]),
                    barcode=_clean(row.get("barcode")) or None,
                    net_quantity=float(row["net_quantity"]) if _clean(row.get("net_quantity")) else None,
                    quantity_unit=_clean(row.get("quantity_unit")) or None,
                )
            )
        else:
            sku.product_id = product.id
            sku.barcode = _clean(row.get("barcode")) or None
            sku.net_quantity = float(row["net_quantity"]) if _clean(row.get("net_quantity")) else None
            sku.quantity_unit = _clean(row.get("quantity_unit")) or None
    batch.status = "confirmed"
    await db.commit()
    return created, updated, skipped


EXPORT_FIELDS = [
    "product_code", "brand_name", "original_language", "original_name", "product_name_en",
    "product_name_zh", "product_type", "country_of_origin", "net_quantity", "quantity_unit",
    "sku", "barcode", "skin_types", "skin_concerns", "key_ingredients", "ingredients_inci",
    "claims", "description_en", "description_zh", "how_to_use_en", "how_to_use_zh",
    "warnings_en", "warnings_zh", "image_urls", "status", "compliance_status",
]


async def export_product_rows(db: AsyncSession) -> list[dict[str, str]]:
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.product_type),
            selectinload(Product.skus),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
            selectinload(Product.claims),
            selectinload(Product.images),
            selectinload(Product.canada),
        )
        .order_by(Product.product_code)
    )
    products = result.scalars().all()
    rows: list[dict[str, str]] = []
    for product in products:
        links = sorted(product.ingredients, key=lambda item: (item.position or 999999, str(item.ingredient_id)))
        common = {
            "product_code": product.product_code,
            "brand_name": product.brand.name,
            "original_language": product.original_language,
            "original_name": product.original_name,
            "product_name_en": product.product_name_en,
            "product_name_zh": product.product_name_zh or "",
            "product_type": product.product_type.code,
            "country_of_origin": product.country_of_origin or "",
            "skin_types": "|".join(item.code for item in product.skin_types),
            "skin_concerns": "|".join(item.code for item in product.skin_concerns),
            "key_ingredients": "|".join(item.ingredient.inci_name for item in links if item.is_key_ingredient),
            "ingredients_inci": ", ".join(item.ingredient.inci_name for item in links) or product.source_inci or "",
            "claims": "|".join(claim.claim_text_en for claim in product.claims if claim.status == "active"),
            "description_en": product.description_en or "",
            "description_zh": product.description_zh or "",
            "how_to_use_en": product.how_to_use_en or "",
            "how_to_use_zh": product.how_to_use_zh or "",
            "warnings_en": product.warnings_en or "",
            "warnings_zh": product.warnings_zh or "",
            "image_urls": "|".join(image.image_url for image in product.images if image.status == "active"),
            "status": product.status,
            "compliance_status": product.canada.compliance_status if product.canada else "pending",
        }
        skus = product.skus or [None]
        for sku in skus:
            row = dict(common)
            row.update(
                {
                    "net_quantity": str(sku.net_quantity) if sku and sku.net_quantity is not None else "",
                    "quantity_unit": sku.quantity_unit if sku and sku.quantity_unit else "",
                    "sku": sku.sku if sku else "",
                    "barcode": sku.barcode if sku and sku.barcode else "",
                }
            )
            rows.append({field: row.get(field, "") for field in EXPORT_FIELDS})
    return rows
