from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens_for(user_id: int) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterIn,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPair:
    conditions = []
    if payload.email:
        conditions.append(User.email == payload.email)
    if payload.phone:
        conditions.append(User.phone == payload.phone)
    existing = (
        await db.execute(select(User).where(or_(*conditions)))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "user with this identifier already exists")

    user = User(
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _tokens_for(user.id)


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginIn,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPair:
    ident = payload.identifier.strip()
    user = (
        await db.execute(
            select(User).where(or_(User.email == ident, User.phone == ident))
        )
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    if user.is_banned:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "user is banned")
    return _tokens_for(user.id)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshIn) -> TokenPair:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid refresh token")
    if data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
    return _tokens_for(int(data["sub"]))


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
