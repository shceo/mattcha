from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.photo import Photo
from app.models.profile import Profile
from app.models.user import User
from app.schemas.discover import DiscoverCard, DiscoverPage
from app.services.geo import haversine_km
from app.services.uploads import url_for_path

router = APIRouter(prefix="/discover", tags=["discover"])


def _age(d: date) -> int:
    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


@router.get("", response_model=DiscoverPage)
async def discover(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
) -> DiscoverPage:
    me = (
        await db.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    if not me:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "create your profile before browsing",
        )

    primary_photo_subq = (
        select(Photo.user_id, Photo.path)
        .where(Photo.is_primary.is_(True))
        .subquery()
    )

    stmt = (
        select(Profile, User, primary_photo_subq.c.path)
        .join(User, User.id == Profile.user_id)
        .outerjoin(primary_photo_subq, primary_photo_subq.c.user_id == Profile.user_id)
        .where(
            and_(
                User.id != user.id,
                User.is_banned.is_(False),
                Profile.gender != me.gender,
            )
        )
        .order_by(Profile.created_at.desc())
        .limit(limit + 1)
        .offset(offset)
    )

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    items: list[DiscoverCard] = []
    for profile, _u, photo_path in rows:
        distance: float | None = None
        if (
            me.lat is not None
            and me.lng is not None
            and profile.lat is not None
            and profile.lng is not None
        ):
            distance = round(haversine_km(me.lat, me.lng, profile.lat, profile.lng), 1)

        items.append(
            DiscoverCard(
                user_id=profile.user_id,
                full_name=profile.full_name,
                gender=profile.gender,
                age=_age(profile.birth_date),
                occupation=profile.occupation,
                life_goals=profile.life_goals,
                address=profile.address,
                distance_km=distance,
                primary_photo_url=url_for_path(photo_path) if photo_path else None,
            )
        )

    return DiscoverPage(
        items=items,
        next_offset=offset + limit if has_more else None,
    )
