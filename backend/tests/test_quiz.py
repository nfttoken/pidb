from types import SimpleNamespace
from uuid import uuid4

from app.services.quiz import QUIZ_WEIGHTS, recommendation_tier, score_product


def test_quiz_weights_are_the_confirmed_v1_weights() -> None:
    assert QUIZ_WEIGHTS == {
        "skin_type": 30,
        "skin_concern": 30,
        "product_type": 20,
        "ingredient": 10,
        "other_preference": 10,
    }


def test_recommendation_score_and_tier() -> None:
    ingredient = SimpleNamespace(inci_name="Niacinamide", common_name_en="Niacinamide")
    product = SimpleNamespace(
        id=uuid4(),
        skin_types=[SimpleNamespace(code="dry")],
        skin_concerns=[SimpleNamespace(code="hydration")],
        product_type=SimpleNamespace(code="serum", name_en="Serum"),
        ingredients=[SimpleNamespace(ingredient=ingredient)],
        attributes={"preferences": ["vegan"]},
    )

    score, reasons = score_product(
        product,
        {
            "skin_type": "dry",
            "skin_concern": ["hydration"],
            "product_type": "serum",
            "ingredient": ["niacinamide"],
            "other_preference": ["vegan"],
        },
    )

    assert score == 100
    assert recommendation_tier(score) == "Excellent"
    assert len(reasons) == 5

