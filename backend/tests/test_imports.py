import pytest
from fastapi import HTTPException

from app.services.imports import parse_csv


def test_parse_csv_normalizes_headers_and_values() -> None:
    rows = parse_csv(
        "product_code,brand_name,original_language,original_name,product_name_en,product_name_zh,product_type,sku,skin_types\n"
        " KR-001 , Brand A , Korean , Original , Serum , 精华 , Serum , SKU-1 , dry|sensitive\n".encode()
    )

    assert rows == [
        {
            "product_code": "KR-001",
            "brand_name": "Brand A",
            "original_language": "Korean",
            "original_name": "Original",
            "product_name_en": "Serum",
            "product_name_zh": "精华",
            "product_type": "Serum",
            "sku": "SKU-1",
            "skin_types": "dry|sensitive",
        }
    ]


def test_parse_csv_rejects_missing_required_header() -> None:
    with pytest.raises(HTTPException) as error:
        parse_csv(b"product_code,brand_name\nKR-001,Brand A\n")

    assert error.value.status_code == 422
    assert error.value.detail["code"] == "MISSING_HEADERS"

