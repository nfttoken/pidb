from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.schemas.common import SuccessResponse
from app.schemas.quiz import (
    QuizAnswersRequest,
    QuizQuestionResponse,
    QuizSessionCreate,
    QuizSessionResponse,
    RecommendationResponse,
)
from app.services.quiz import create_session, get_questions, get_session, recommend, save_answers


router = APIRouter()


@router.post("/quiz/sessions", response_model=SuccessResponse[QuizSessionResponse], status_code=201)
async def start_quiz(payload: QuizSessionCreate, db: DbSession):
    session = await create_session(db, payload.language)
    return SuccessResponse(
        data=QuizSessionResponse(
            session_token=session.session_token,
            language=session.language,
            status=session.status,
        )
    )


@router.get("/quiz/questions", response_model=SuccessResponse[list[QuizQuestionResponse]])
async def quiz_questions(db: DbSession):
    return SuccessResponse(data=await get_questions(db))


@router.post("/quiz/sessions/{session_token}/answers", response_model=SuccessResponse[QuizSessionResponse])
async def submit_answers(session_token: str, payload: QuizAnswersRequest, db: DbSession):
    session = await get_session(db, session_token)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "QUIZ_SESSION_NOT_FOUND", "message": "Quiz session not found"})
    session = await save_answers(db, session, payload.answers)
    return SuccessResponse(
        data=QuizSessionResponse(
            session_token=session.session_token,
            language=session.language,
            status=session.status,
        )
    )


@router.post(
    "/quiz/sessions/{session_token}/recommendations",
    response_model=SuccessResponse[RecommendationResponse],
)
async def recommendations(session_token: str, db: DbSession):
    session = await get_session(db, session_token)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "QUIZ_SESSION_NOT_FOUND", "message": "Quiz session not found"})
    return SuccessResponse(data=await recommend(db, session))
