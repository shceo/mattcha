from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.db import get_db
from app.models.photo import Photo
from app.models.profile import Profile
from app.models.site_content import SiteContent
from app.models.user import User
from app.models.venue import PromoCode, Venue
from app.schemas.admin import AdminUserListItem, AdminUsersPage
from app.schemas.content import LandingContent, landing_dump
from app.schemas.venue import (
    PromoIn,
    PromoOut,
    PromoUpdate,
    VenueIn,
    VenueOut,
    VenueUpdate,
    VenueWithPromos,
)
from app.services.uploads import url_for_path

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _age(d: date) -> int:
    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


@router.get("/users", response_model=AdminUsersPage)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminUsersPage:
    photo_subq = (
        select(Photo.user_id, Photo.path)
        .where(Photo.is_primary.is_(True))
        .subquery()
    )
    base = (
        select(User, Profile, photo_subq.c.path)
        .outerjoin(Profile, Profile.user_id == User.id)
        .outerjoin(photo_subq, photo_subq.c.user_id == User.id)
    )
    count_stmt = select(func.count(User.id))
    if q:
        like = f"%{q.strip()}%"
        cond = or_(
            User.email.ilike(like),
            User.phone.ilike(like),
            Profile.full_name.ilike(like),
        )
        base = base.where(cond)
        count_stmt = count_stmt.outerjoin(Profile, Profile.user_id == User.id).where(cond)

    total = (await db.execute(count_stmt)).scalar_one()

    rows = (
        await db.execute(
            base.order_by(User.created_at.desc()).limit(limit).offset(offset)
        )
    ).all()

    items: list[AdminUserListItem] = []
    for u, p, photo_path in rows:
        items.append(
            AdminUserListItem(
                id=u.id,
                email=u.email,
                phone=u.phone,
                role=u.role,
                is_banned=u.is_banned,
                created_at=u.created_at,
                has_profile=p is not None,
                full_name=p.full_name if p else None,
                gender=p.gender if p else None,
                age=_age(p.birth_date) if p else None,
                primary_photo_url=url_for_path(photo_path) if photo_path else None,
            )
        )
    return AdminUsersPage(items=items, total=total)


async def _get_user(db: AsyncSession, user_id: int) -> User:
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    return u


@router.post("/users/{user_id}/ban", response_model=AdminUserListItem)
async def ban_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
) -> AdminUserListItem:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "you cannot ban yourself")
    u = await _get_user(db, user_id)
    u.is_banned = True
    await db.commit()
    await db.refresh(u)
    return await _user_to_list_item(db, u)


@router.post("/users/{user_id}/unban", response_model=AdminUserListItem)
async def unban_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserListItem:
    u = await _get_user(db, user_id)
    u.is_banned = False
    await db.commit()
    await db.refresh(u)
    return await _user_to_list_item(db, u)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
) -> None:
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "you cannot delete yourself")
    u = await _get_user(db, user_id)
    await db.delete(u)
    await db.commit()


async def _user_to_list_item(db: AsyncSession, u: User) -> AdminUserListItem:
    p = (
        await db.execute(select(Profile).where(Profile.user_id == u.id))
    ).scalar_one_or_none()
    photo_path = (
        await db.execute(
            select(Photo.path).where(
                and_(Photo.user_id == u.id, Photo.is_primary.is_(True))
            )
        )
    ).scalar_one_or_none()
    return AdminUserListItem(
        id=u.id,
        email=u.email,
        phone=u.phone,
        role=u.role,
        is_banned=u.is_banned,
        created_at=u.created_at,
        has_profile=p is not None,
        full_name=p.full_name if p else None,
        gender=p.gender if p else None,
        age=_age(p.birth_date) if p else None,
        primary_photo_url=url_for_path(photo_path) if photo_path else None,
    )


# --- Venues ----------------------------------------------------------------


@router.get("/venues", response_model=list[VenueWithPromos])
async def list_venues(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VenueWithPromos]:
    venues = (
        await db.execute(select(Venue).order_by(Venue.created_at.desc()))
    ).scalars().all()
    if not venues:
        return []
    venue_ids = [v.id for v in venues]
    promos = (
        await db.execute(select(PromoCode).where(PromoCode.venue_id.in_(venue_ids)))
    ).scalars().all()
    by_venue: dict[int, list[PromoCode]] = {}
    for p in promos:
        by_venue.setdefault(p.venue_id, []).append(p)
    return [
        VenueWithPromos(
            id=v.id,
            name=v.name,
            description=v.description,
            address=v.address,
            lat=v.lat,
            lng=v.lng,
            image_url=v.image_url,
            is_active=v.is_active,
            promos=[PromoOut.model_validate(p) for p in by_venue.get(v.id, [])],
            distance_km=None,
        )
        for v in venues
    ]


@router.post("/venues", response_model=VenueOut, status_code=status.HTTP_201_CREATED)
async def create_venue(
    payload: VenueIn,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VenueOut:
    v = Venue(**payload.model_dump())
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return VenueOut.model_validate(v)


@router.patch("/venues/{venue_id}", response_model=VenueOut)
async def update_venue(
    venue_id: int,
    payload: VenueUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VenueOut:
    v = (
        await db.execute(select(Venue).where(Venue.id == venue_id))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "venue not found")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    await db.commit()
    await db.refresh(v)
    return VenueOut.model_validate(v)


@router.delete("/venues/{venue_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_venue(
    venue_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    v = (
        await db.execute(select(Venue).where(Venue.id == venue_id))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "venue not found")
    await db.delete(v)
    await db.commit()


# --- Promos ----------------------------------------------------------------


@router.post(
    "/venues/{venue_id}/promos",
    response_model=PromoOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_promo(
    venue_id: int,
    payload: PromoIn,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PromoOut:
    v = (
        await db.execute(select(Venue).where(Venue.id == venue_id))
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "venue not found")
    p = PromoCode(venue_id=venue_id, **payload.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return PromoOut.model_validate(p)


@router.patch("/promos/{promo_id}", response_model=PromoOut)
async def update_promo(
    promo_id: int,
    payload: PromoUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PromoOut:
    p = (
        await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "promo not found")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, val)
    await db.commit()
    await db.refresh(p)
    return PromoOut.model_validate(p)


@router.delete("/promos/{promo_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_promo(
    promo_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    p = (
        await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "promo not found")
    await db.delete(p)
    await db.commit()


# --- Site content (CMS) ----------------------------------------------------

ALLOWED_LOCALES = {"ru", "en", "uz"}


@router.get("/content/landing/{locale}")
async def admin_get_landing(
    locale: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict | None:
    if locale not in ALLOWED_LOCALES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown locale")
    row = (
        await db.execute(select(SiteContent).where(SiteContent.locale == locale))
    ).scalar_one_or_none()
    return row.payload if row else None


@router.put("/content/landing/{locale}")
async def admin_put_landing(
    locale: str,
    payload: LandingContent,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if locale not in ALLOWED_LOCALES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown locale")
    serialized = landing_dump(payload)
    row = (
        await db.execute(select(SiteContent).where(SiteContent.locale == locale))
    ).scalar_one_or_none()
    if row:
        row.payload = serialized
    else:
        row = SiteContent(locale=locale, payload=serialized)
        db.add(row)
    await db.commit()
    return serialized


@router.delete(
    "/content/landing/{locale}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def admin_delete_landing(
    locale: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if locale not in ALLOWED_LOCALES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown locale")
    row = (
        await db.execute(select(SiteContent).where(SiteContent.locale == locale))
    ).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
