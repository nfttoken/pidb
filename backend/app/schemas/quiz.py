import uuid
from typing import Literal

from pydantic import BaseModel, Field


class QuizSessionCreate(BaseModel):
    language: Literal["en", "zh"] = "en"


class QuizSessionResponse(BaseModel):
    session_token: str
    language: str
    status: str


class QuizQuestionOption(BaseModel):
    code: str
    label_en: str
    label_zh: str


class QuizQuestionResponse(BaseModel):
    code: str
    question_en: str
    question_zh: str
    answer_type: Literal["single", "multiple"]
    options: list[QuizQuestionOption]


class QuizAnswersRequest(BaseModel):
    answers: dict[str, str | list[str]] = Field(min_length=1)


class RecommendationItem(BaseModel):
    product_id: uuid.UUID
    product_code: str
    product_name_en: str
    product_name_zh: str | None
    score: int
    tier: Literal["Excellent", "Good", "Potential", "Do Not Recommend"]
    reasons: list[str]


class RecommendationResponse(BaseModel):
    session_token: str
    score_weights: dict[str, int]
    recommendations: list[RecommendationItem]
    disclaimer_en: str
    disclaimer_zh: str

