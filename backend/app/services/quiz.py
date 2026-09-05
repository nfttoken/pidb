import secrets
import string
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import Ingredient, Product, ProductIngredient, ProductType
from app.models.review import ProductCanada
from app.models.quiz import QuizAnswer, QuizSession
from app.schemas.quiz import (
    QuizQuestionOption,
    QuizQuestionResponse,
    RecommendationItem,
    RecommendationResponse,
)


QUIZ_WEIGHTS = {
    "skin_type": 30,
    "skin_concern": 30,
    "product_type": 20,
    "ingredient": 10,
    "other_preference": 10,
}

OTHER_PREFERENCES = [
    ("vegan", "Vegan", "纯素"),
    ("fragrance_free", "Fragrance-free", "无香精"),
    ("cruelty_free", "Cruelty-free", "无动物实验"),
    ("alcohol_free", "Alcohol-free", "无酒精"),
]

QUIZ_QUESTIONS = [
    QuizQuestionResponse(
        code="skin_type",
        question_en="What is your skin type?",
        question_zh="你的肤质是什么？",
        answer_type="single",
        options=[
            QuizQuestionOption(code=code, label_en=label, label_zh=label_zh)
            for code, label, label_zh in [
                ("normal", "Normal", "正常肌肤"),
                ("dry", "Dry", "干性肌肤"),
                ("oily", "Oily", "油性肌肤"),
                ("combination", "Combination", "混合性肌肤"),
                ("sensitive", "Sensitive", "敏感肌肤"),
            ]
        ],
    ),
    QuizQuestionResponse(
        code="skin_concern",
        question_en="What are your main skin concerns?",
        question_zh="你主要关注哪些肌肤问题？",
        answer_type="multiple",
        options=[
            QuizQuestionOption(code=code, label_en=label, label_zh=label_zh)
            for code, label, label_zh in [
                ("hydration", "Hydration", "补水"),
                ("dryness", "Dryness", "干燥"),
                ("redness", "Redness", "泛红"),
                ("acne_prone", "Blemish-prone", "痘肌"),
                ("dullness", "Dullness", "暗沉"),
                ("skin_barrier", "Skin barrier", "皮肤屏障"),
            ]
        ],
    ),
    QuizQuestionResponse(
        code="product_type",
        question_en="What product type are you looking for?",
        question_zh="你正在寻找哪种产品？",
        answer_type="single",
        options=[],
    ),
    QuizQuestionResponse(
        code="ingredient",
        question_en="Do you prefer any ingredients?",
        question_zh="你偏好哪些成分？",
        answer_type="multiple",
        options=[],
    ),
    QuizQuestionResponse(
        code="other_preference",
        question_en="Do you have any product preferences?",
        question_zh="你有其他产品偏好吗？",
        answer_type="multiple",
        options=[
            QuizQuestionOption(code=code, label_en=label, label_zh=label_zh)
            for code, label, label_zh in OTHER_PREFERENCES
        ],
    ),
]


async def get_questions(db: AsyncSession) -> list[QuizQuestionResponse]:
    product_types = (await db.execute(select(ProductType).where(ProductType.status == "active").order_by(ProductType.sort_order, ProductType.name_en))).scalars().all()
    ingredients = (await db.execute(select(Ingredient).where(Ingredient.status == "active").order_by(Ingredient.inci_name))).scalars().all()
    questions = [question.model_copy(deep=True) for question in QUIZ_QUESTIONS]
    by_code = {question.code: question for question in questions}
    by_code["product_type"].options = [
        QuizQuestionOption(code=item.code, label_en=item.name_en, label_zh=item.name_zh or item.name_en)
        for item in product_types
    ]
    by_code["ingredient"].options = [
        QuizQuestionOption(
            code=item.inci_name,
            label_en=item.common_name_en or item.inci_name,
            label_zh=item.common_name_zh or item.common_name_en or item.inci_name,
        )
        for item in ingredients
    ]
    return questions


def _new_session_token() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(48))


def _as_list(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    return [value] if isinstance(value, str) else value


def recommendation_tier(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Potential"
    return "Do Not Recommend"


def score_product(product: Product, answers: dict) -> tuple[int, list[str]]:
    skin_type = str(answers.get("skin_type", "")).lower()
    product_skin_types = {item.code.lower() for item in product.skin_types}
    skin_type_score = QUIZ_WEIGHTS["skin_type"] if skin_type in product_skin_types else 0

    concerns = {item.lower() for item in _as_list(answers.get("skin_concern"))}
    product_concerns = {item.code.lower() for item in product.skin_concerns}
    concern_score = (
        round(QUIZ_WEIGHTS["skin_concern"] * len(concerns & product_concerns) / len(concerns))
        if concerns
        else 0
    )

    requested_type = str(answers.get("product_type", "")).lower()
    product_type_values = {product.product_type.code.lower(), product.product_type.name_en.lower()}
    product_type_score = QUIZ_WEIGHTS["product_type"] if requested_type in product_type_values else 0

    ingredient_preferences = {item.lower() for item in _as_list(answers.get("ingredient"))}
    ingredient_values = {
        value.lower()
        for link in product.ingredients
        for value in (link.ingredient.inci_name, link.ingredient.common_name_en or "")
    }
    ingredient_score = (
        QUIZ_WEIGHTS["ingredient"]
        if ingredient_preferences & ingredient_values
        else 0
    )

    preferences = {item.lower() for item in _as_list(answers.get("other_preference"))}
    product_preferences = {str(value).lower() for value in product.attributes.get("preferences", [])}
    preference_score = (
        round(QUIZ_WEIGHTS["other_preference"] * len(preferences & product_preferences) / len(preferences))
        if preferences
        else 0
    )

    reasons: list[str] = []
    if skin_type_score:
        reasons.append("Matches your skin type")
    if concern_score:
        reasons.append("Addresses your selected skin concerns")
    if product_type_score:
        reasons.append("Matches your requested product type")
    if ingredient_score:
        reasons.append("Contains a preferred ingredient")
    if preference_score:
        reasons.append("Matches your product preferences")
    return skin_type_score + concern_score + product_type_score + ingredient_score + preference_score, reasons


async def create_session(db: AsyncSession, language: str) -> QuizSession:
    session = QuizSession(session_token=_new_session_token(), language=language)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, token: str) -> QuizSession | None:
    return await db.scalar(select(QuizSession).where(QuizSession.session_token == token))


async def save_answers(db: AsyncSession, session: QuizSession, answers: dict) -> QuizSession:
    session.answers = answers
    for question_code, answer_value in answers.items():
        answer = await db.scalar(
            select(QuizAnswer).where(
                QuizAnswer.session_id == session.id,
                QuizAnswer.question_code == question_code,
            )
        )
        if answer is None:
            db.add(QuizAnswer(session_id=session.id, question_code=question_code, answer_value=answer_value))
        else:
            answer.answer_value = answer_value
    await db.commit()
    await db.refresh(session)
    return session


async def recommend(db: AsyncSession, session: QuizSession) -> RecommendationResponse:
    if not session.answers:
        raise HTTPException(status_code=422, detail="Quiz answers are required")
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.product_type),
            selectinload(Product.skin_types),
            selectinload(Product.skin_concerns),
            selectinload(Product.ingredients).selectinload(ProductIngredient.ingredient),
        )
        .join(ProductCanada, ProductCanada.product_id == Product.id)
        .where(
            Product.status.in_(["published", "active"]),
            ProductCanada.compliance_status == "approved",
        )
    )
    products = result.scalars().all()
    scored = sorted(
        [(score_product(product, session.answers), product) for product in products],
        key=lambda item: item[0][0],
        reverse=True,
    )[:5]
    session.status = "completed"
    session.completed_at = datetime.now(UTC)
    await db.commit()
    return RecommendationResponse(
        session_token=session.session_token,
        score_weights=QUIZ_WEIGHTS,
        recommendations=[
            RecommendationItem(
                product_id=product.id,
                product_code=product.product_code,
                product_name_en=product.product_name_en,
                product_name_zh=product.product_name_zh,
                score=score,
                tier=recommendation_tier(score),
                reasons=reasons,
            )
            for (score, reasons), product in scored
            if score >= 60
        ],
        disclaimer_en="This result is informational and is not a medical diagnosis.",
        disclaimer_zh="本结果仅供信息参考，不构成医疗诊断。",
    )
