import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.services.products import _validate_skus, validate_status_transition


def test_product_status_transition_allows_lifecycle_progression() -> None:
    validate_status_transition("draft", "imported")
    validate_status_transition("ready", "published")
    validate_status_transition("published", "active")


def test_product_status_transition_rejects_skipping_review() -> None:
    with pytest.raises(HTTPException) as error:
        validate_status_transition("draft", "active")

    assert error.value.status_code == 409
    assert error.value.detail["code"] == "INVALID_STATUS_TRANSITION"


@pytest.mark.asyncio
async def test_product_create_rejects_duplicate_skus_in_payload() -> None:
    with pytest.raises(HTTPException) as error:
        await _validate_skus(
            None,
            [SimpleNamespace(sku="SKU-1", barcode=None), SimpleNamespace(sku="SKU-1", barcode=None)],
        )

    assert error.value.status_code == 409
    assert error.value.detail["code"] == "DUPLICATE_RESOURCE"


@pytest.mark.asyncio
async def test_product_create_rejects_duplicate_barcodes_in_payload() -> None:
    with pytest.raises(HTTPException) as error:
        await _validate_skus(
            None,
            [SimpleNamespace(sku="SKU-1", barcode="123"), SimpleNamespace(sku="SKU-2", barcode="123")],
        )

    assert error.value.status_code == 409
    assert error.value.detail["code"] == "DUPLICATE_RESOURCE"
