from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.photo import Photo
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import (
    PhotoOut,
    ProfileCreate,
    ProfileOut,
    ProfileUpdate,
)
from app.services.uploads import save_user_photo, url_for_path

router = APIRouter(prefix="/profile", tags=["profile"])


def _age(d: date) -> int:
    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


async def _photos_for(db: AsyncSession, user_id: int) -> list[PhotoOut]:
    rows = (
        await db.execute(
            select(Photo)
            .where(Photo.user_id == user_id)
            .order_by(Photo.is_primary.desc(), Photo.sort_order.asc(), Photo.id.asc())
        )
    ).scalars().all()
    return [
        PhotoOut(id=p.id, url=url_for_path(p.path), is_primary=p.is_primary, sort_order=p.sort_order)
        for p in rows
    ]


def _profile_out(p: Profile, photos: list[PhotoOut]) -> ProfileOut:
    return ProfileOut(
        user_id=p.user_id,
        full_name=p.full_name,
        gender=p.gender,
        birth_date=p.birth_date,
        age=_age(p.birth_date),
        occupation=p.occupation,
        life_goals=p.life_goals,
        address=p.address,
        lat=p.lat,
        lng=p.lng,
        photos=photos,
    )


@router.get("/me", response_model=ProfileOut | None)
async def get_my_profile(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProfileOut | None:
    profile = (
        await db.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    if not profile:
        return None
    photos = await _photos_for(db, user.id)
    return _profile_out(profile, photos)


@router.post("/me", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    payload: ProfileCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProfileOut:
    existing = (
        await db.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "profile already exists; use PATCH /profile/me to edit",
        )
    if _age(payload.birth_date) < 18:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "must be at least 18 years old")

    profile = Profile(
        user_id=user.id,
        full_name=payload.full_name,
        gender=payload.gender,
        birth_date=payload.birth_date,
        occupation=payload.occupation,
        life_goals=payload.life_goals,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _profile_out(profile, [])


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProfileOut:
    profile = (
        await db.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not created yet")

    data = payload.model_dump(exclude_unset=True)
    # Defense in depth: even if a future schema change leaks `gender`, never apply it.
    data.pop("gender", None)
    if "birth_date" in data and _age(data["birth_date"]) < 18:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "must be at least 18 years old")

    for k, v in data.items():
        setattr(profile, k, v)
    await db.commit()
    await db.refresh(profile)
    photos = await _photos_for(db, user.id)
    return _profile_out(profile, photos)


@router.post("/me/photos", response_model=PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_my_photo(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> PhotoOut:
    rel_path = await save_user_photo(user.id, file)

    has_any = (
        await db.execute(
            select(Photo.id).where(Photo.user_id == user.id).limit(1)
        )
    ).first()

    photo = Photo(
        user_id=user.id,
        path=rel_path,
        sort_order=0,
        is_primary=not has_any,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return PhotoOut(
        id=photo.id, url=url_for_path(photo.path), is_primary=photo.is_primary, sort_order=photo.sort_order
    )


@router.post("/me/photos/{photo_id}/primary", response_model=PhotoOut)
async def set_primary_photo(
    photo_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PhotoOut:
    photo = (
        await db.execute(
            select(Photo).where(Photo.id == photo_id, Photo.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not photo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "photo not found")

    await db.execute(
        update(Photo).where(Photo.user_id == user.id).values(is_primary=False)
    )
    photo.is_primary = True
    await db.commit()
    await db.refresh(photo)
    return PhotoOut(
        id=photo.id, url=url_for_path(photo.path), is_primary=photo.is_primary, sort_order=photo.sort_order
    )


@router.delete("/me/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_my_photo(
    photo_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    photo = (
        await db.execute(
            select(Photo).where(Photo.id == photo_id, Photo.user_id == user.id)
        )
    ).scalar_one_or_none()
    if not photo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "photo not found")

    was_primary = photo.is_primary
    await db.execute(delete(Photo).where(Photo.id == photo_id))
    if was_primary:
        next_photo = (
            await db.execute(
                select(Photo)
                .where(Photo.user_id == user.id)
                .order_by(Photo.sort_order.asc(), Photo.id.asc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if next_photo:
            next_photo.is_primary = True
    await db.commit()
