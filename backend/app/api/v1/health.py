from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.schemas.common import SuccessResponse


router = APIRouter()


@router.get("/live", response_model=SuccessResponse[dict[str, str]])
async def live() -> SuccessResponse[dict[str, str]]:
    return SuccessResponse(data={"status": "ok"})


@router.get("/ready", response_model=SuccessResponse[dict[str, str]])
async def ready(db: DbSession) -> SuccessResponse[dict[str, str]]:
    await db.execute(text("SELECT 1"))
    return SuccessResponse(data={"status": "ready"})

