from types import SimpleNamespace
from uuid import uuid4

from app.services.review import calculate_readiness


def test_readiness_requires_compliance_and_content() -> None:
    product = SimpleNamespace(
        id=uuid4(),
        product_code="KR-SERUM-001",
        original_language="ko",
        original_name="Original",
        product_name_en="Hydrating Serum",
        product_name_zh="补水精华",
        country_of_origin="KR",
        description_en="Hydrating serum",
        description_zh="补水精华",
        how_to_use_en="Apply daily",
        how_to_use_zh="每日使用",
        brand=object(),
        product_type=object(),
        skin_types=[object()],
        skin_concerns=[],
        source_inci="Water, Glycerin",
        ingredients=[],
        images=[object()],
        canada=SimpleNamespace(compliance_status="approved"),
    )

    readiness = calculate_readiness(product)

    assert readiness.score == 100
    assert readiness.ready is True
    assert readiness.blockers == []

