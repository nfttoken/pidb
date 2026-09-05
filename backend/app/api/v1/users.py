import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, require_roles
from app.core.security import hash_password
from app.models.auth import AuthSession, User
from app.schemas.auth import UserCreate, UserResponse, UserUpdate
from app.schemas.common import SuccessResponse


router = APIRouter()


@router.get("/users", response_model=SuccessResponse[list[UserResponse]])
async def list_users(db: DbSession, _: object = Depends(require_roles("admin"))):
    result = await db.execute(select(User).order_by(User.name, User.email))
    return SuccessResponse(data=list(result.scalars().all()))


@router.post("/users", response_model=SuccessResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: DbSession, _: object = Depends(require_roles("admin"))):
    if await db.scalar(select(User.id).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_RESOURCE", "message": "Email already exists"})
    user = User(email=payload.email, name=payload.name, role=payload.role, password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return SuccessResponse(data=user)


@router.patch("/users/{user_id}", response_model=SuccessResponse[UserResponse])
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: DbSession,
    current_user=Depends(require_roles("admin")),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    values = payload.model_dump(exclude_unset=True)
    if user.id == current_user.id and values.get("is_active") is False:
        raise HTTPException(status_code=409, detail="You cannot deactivate your own account")
    if "password" in values:
        user.password_hash = hash_password(values.pop("password"))
    for field, value in values.items():
        setattr(user, field, value)
    if user.is_active is False:
        sessions = (
            await db.execute(
                select(AuthSession).where(
                    AuthSession.user_id == user.id,
                    AuthSession.revoked_at.is_(None),
                )
            )
        ).scalars().all()
        for session in sessions:
            session.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return SuccessResponse(data=user)
