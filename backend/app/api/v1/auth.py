import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, get_current_user_id
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.models.auth import AuthSession, User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.schemas.common import SuccessResponse


router = APIRouter()


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.app_env != "development",
        samesite="lax",
        path=f"{settings.api_prefix}/auth",
    )


async def _get_user_for_session(db: DbSession, session: AuthSession) -> User | None:
    result = await db.execute(select(User).where(User.id == session.user_id))
    return result.scalar_one_or_none()


@router.post("/login", response_model=SuccessResponse[TokenResponse])
async def login(payload: LoginRequest, response: Response, db: DbSession):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    now = datetime.now(UTC)
    refresh_token = create_refresh_token()
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    user.last_login_at = now
    await db.commit()
    _set_refresh_cookie(response, refresh_token)

    access_token = create_access_token(subject=str(user.id), role=user.role)
    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
    )


@router.post("/refresh", response_model=SuccessResponse[TokenResponse])
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    result = await db.execute(
        select(AuthSession).where(AuthSession.token_hash == hash_refresh_token(refresh_token))
    )
    session = result.scalar_one_or_none()
    user = await _get_user_for_session(db, session) if session else None
    if session is None or user is None or not session.is_valid or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    session.revoked_at = datetime.now(UTC)
    new_refresh_token = create_refresh_token()
    db.add(
        AuthSession(
            user_id=session.user_id,
            token_hash=hash_refresh_token(new_refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    await db.commit()
    _set_refresh_cookie(response, new_refresh_token)

    access_token = create_access_token(subject=str(user.id), role=user.role)
    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
    )


@router.post("/logout")
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: Annotated[str | None, Cookie(alias=settings.refresh_cookie_name)] = None,
):
    if refresh_token:
        result = await db.execute(
            select(AuthSession).where(AuthSession.token_hash == hash_refresh_token(refresh_token))
        )
        session = result.scalar_one_or_none()
        if session:
            session.revoked_at = datetime.now(UTC)
            await db.commit()
    response.delete_cookie(settings.refresh_cookie_name, path=f"{settings.api_prefix}/auth")
    return SuccessResponse(data={"logged_out": True})


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def me(user_id: Annotated[str, Depends(get_current_user_id)], db: DbSession):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return SuccessResponse(data=UserResponse.model_validate(user))

