from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_db
from app.models.match import Match, MatchStatus, Message
from app.models.photo import Photo
from app.models.profile import Gender, Profile
from app.models.user import User
from app.models.venue import PromoCode, Venue
from app.schemas.match import (
    CounterpartCard,
    ExtendIn,
    MatchListItem,
    MatchOut,
    MessageCreateIn,
    MessageOut,
    MessagesPage,
)
from app.schemas.venue import (
    MatchVenueRecommendation,
    PromoOut,
    VenueWithPromos,
)
from app.services.geo import haversine_km, midpoint
from app.services.uploads import url_for_path

router = APIRouter(prefix="/matches", tags=["matches"])

DEFAULT_QUOTA_LIMIT = 15


def _age(d: date) -> int:
    today = date.today()
    return today.year - d.year - ((today.month, today.day) < (d.month, d.day))


def _quota_remaining(m: Match) -> int | None:
    if m.quota_limit is None:
        return None
    return max(0, m.quota_limit - m.quota_used)


async def _load_counterpart(db: AsyncSession, user_id: int) -> CounterpartCard:
    row = (
        await db.execute(
            select(Profile, Photo.path)
            .outerjoin(
                Photo,
                and_(Photo.user_id == Profile.user_id, Photo.is_primary.is_(True)),
            )
            .where(Profile.user_id == user_id)
        )
    ).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user has no profile")
    profile, photo_path = row
    return CounterpartCard(
        user_id=profile.user_id,
        full_name=profile.full_name,
        gender=profile.gender,
        age=_age(profile.birth_date),
        primary_photo_url=url_for_path(photo_path) if photo_path else None,
        address=profile.address,
    )


def _ensure_participant(m: Match, user_id: int) -> str:
    if user_id == m.initiator_id:
        return "initiator"
    if user_id == m.recipient_id:
        return "recipient"
    raise HTTPException(status.HTTP_403_FORBIDDEN, "not a participant")


def _to_out(m: Match, user_id: int, counterpart: CounterpartCard) -> MatchOut:
    return MatchOut(
        id=m.id,
        initiator_id=m.initiator_id,
        recipient_id=m.recipient_id,
        status=m.status,
        quota_limit=m.quota_limit,
        quota_used=m.quota_used,
        quota_remaining=_quota_remaining(m),
        matched_at=m.matched_at,
        created_at=m.created_at,
        am_initiator=user_id == m.initiator_id,
        counterpart=counterpart,
    )


@router.post("/with/{user_id}", response_model=MatchOut)
async def get_or_create_match(
    user_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MatchOut:
    if user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "cannot match with yourself")

    me_profile = (
        await db.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    if not me_profile:
        raise HTTPException(status.HTTP_409_CONFLICT, "create your profile first")

    other_profile = (
        await db.execute(select(Profile).where(Profile.user_id == user_id))
    ).scalar_one_or_none()
    if not other_profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "target user has no profile")

    other_user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not other_user or other_user.is_banned:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not available")

    if me_profile.gender == other_profile.gender:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "matches require opposite genders"
        )

    if me_profile.gender == Gender.male:
        initiator_id, recipient_id = user.id, user_id
    else:
        initiator_id, recipient_id = user_id, user.id

    existing = (
        await db.execute(
            select(Match).where(
                Match.initiator_id == initiator_id,
                Match.recipient_id == recipient_id,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        if me_profile.gender != Gender.male:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "only the man can start the conversation",
            )
        candidate = Match(
            initiator_id=initiator_id,
            recipient_id=recipient_id,
            status=MatchStatus.open,
            quota_limit=DEFAULT_QUOTA_LIMIT,
            quota_used=0,
        )
        db.add(candidate)
        try:
            await db.commit()
            await db.refresh(candidate)
            existing = candidate
        except IntegrityError:
            await db.rollback()
            existing = (
                await db.execute(
                    select(Match).where(
                        Match.initiator_id == initiator_id,
                        Match.recipient_id == recipient_id,
                    )
                )
            ).scalar_one_or_none()
            if existing is None:
                raise HTTPException(
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "failed to create match",
                )

    counterpart = await _load_counterpart(db, user_id)
    return _to_out(existing, user.id, counterpart)


@router.get("", response_model=list[MatchListItem])
async def my_inbox(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MatchListItem]:
    rows = (
        await db.execute(
            select(Match)
            .where(or_(Match.initiator_id == user.id, Match.recipient_id == user.id))
            .order_by(desc(Match.updated_at))
        )
    ).scalars().all()

    items: list[MatchListItem] = []
    for m in rows:
        other_id = m.recipient_id if user.id == m.initiator_id else m.initiator_id
        counterpart = await _load_counterpart(db, other_id)
        last = (
            await db.execute(
                select(Message)
                .where(Message.match_id == m.id)
                .order_by(desc(Message.created_at))
                .limit(1)
            )
        ).scalar_one_or_none()
        items.append(
            MatchListItem(
                id=m.id,
                status=m.status,
                quota_limit=m.quota_limit,
                quota_used=m.quota_used,
                matched_at=m.matched_at,
                last_message_at=last.created_at if last else None,
                last_message_preview=(last.body[:120] if last else None),
                am_initiator=user.id == m.initiator_id,
                counterpart=counterpart,
            )
        )
    return items


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(
    match_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MatchOut:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    _ensure_participant(m, user.id)
    other_id = m.recipient_id if user.id == m.initiator_id else m.initiator_id
    counterpart = await _load_counterpart(db, other_id)
    return _to_out(m, user.id, counterpart)


@router.get("/{match_id}/messages", response_model=MessagesPage)
async def list_messages(
    match_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    after: int | None = Query(default=None, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
) -> MessagesPage:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    _ensure_participant(m, user.id)

    stmt = select(Message).where(Message.match_id == match_id)
    if after is not None:
        stmt = stmt.where(Message.id > after)
    stmt = stmt.order_by(Message.id.asc()).limit(limit)

    rows = (await db.execute(stmt)).scalars().all()
    return MessagesPage(
        items=[
            MessageOut(id=r.id, sender_id=r.sender_id, body=r.body, created_at=r.created_at)
            for r in rows
        ]
    )


@router.post(
    "/{match_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    match_id: int,
    payload: MessageCreateIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageOut:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    role = _ensure_participant(m, user.id)

    if m.status not in (MatchStatus.open, MatchStatus.matched):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "conversation is closed")

    if role == "initiator" and m.status == MatchStatus.open:
        if m.quota_limit is not None and m.quota_used >= m.quota_limit:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "no messages left")

    body = payload.body.strip()
    if not body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "empty message")

    msg = Message(match_id=match_id, sender_id=user.id, body=body)
    db.add(msg)

    if role == "initiator" and m.status == MatchStatus.open:
        m.quota_used += 1
        if m.quota_limit is not None and m.quota_used >= m.quota_limit:
            m.status = MatchStatus.expired

    await db.commit()
    await db.refresh(msg)
    return MessageOut(id=msg.id, sender_id=msg.sender_id, body=msg.body, created_at=msg.created_at)


@router.post("/{match_id}/agree", response_model=MatchOut)
async def agree_to_meet(
    match_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MatchOut:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    role = _ensure_participant(m, user.id)
    if role != "recipient":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "only the recipient can agree to a date"
        )
    if m.status != MatchStatus.open:
        raise HTTPException(status.HTTP_409_CONFLICT, "match is not open")
    m.status = MatchStatus.matched
    m.matched_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m)
    counterpart = await _load_counterpart(db, m.initiator_id)
    return _to_out(m, user.id, counterpart)


@router.post("/{match_id}/extend", response_model=MatchOut)
async def extend_quota(
    match_id: int,
    payload: ExtendIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MatchOut:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    role = _ensure_participant(m, user.id)
    if role != "recipient":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "only the recipient can extend"
        )
    if m.status != MatchStatus.open:
        raise HTTPException(status.HTTP_409_CONFLICT, "match is not open")

    if payload.unlimited:
        m.quota_limit = None
    else:
        assert payload.add is not None
        base = m.quota_limit if m.quota_limit is not None else m.quota_used
        m.quota_limit = base + payload.add

    await db.commit()
    await db.refresh(m)
    counterpart = await _load_counterpart(db, m.initiator_id)
    return _to_out(m, user.id, counterpart)


@router.get("/{match_id}/venues", response_model=MatchVenueRecommendation)
async def venue_recommendations(
    match_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=5, ge=1, le=20),
) -> MatchVenueRecommendation:
    m = (
        await db.execute(select(Match).where(Match.id == match_id))
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "match not found")
    _ensure_participant(m, user.id)
    if m.status != MatchStatus.matched:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "venues unlock only after both agree"
        )

    initiator_profile = (
        await db.execute(select(Profile).where(Profile.user_id == m.initiator_id))
    ).scalar_one_or_none()
    recipient_profile = (
        await db.execute(select(Profile).where(Profile.user_id == m.recipient_id))
    ).scalar_one_or_none()

    if (
        not initiator_profile
        or initiator_profile.lat is None
        or initiator_profile.lng is None
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "initiator has no location set in their profile",
        )
    if (
        not recipient_profile
        or recipient_profile.lat is None
        or recipient_profile.lng is None
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "recipient has no location set in their profile",
        )

    mid_lat, mid_lng = midpoint(
        initiator_profile.lat,
        initiator_profile.lng,
        recipient_profile.lat,
        recipient_profile.lng,
    )

    active_venues = (
        await db.execute(select(Venue).where(Venue.is_active.is_(True)))
    ).scalars().all()

    enriched = [
        (v, haversine_km(mid_lat, mid_lng, v.lat, v.lng)) for v in active_venues
    ]
    enriched.sort(key=lambda x: x[1])
    enriched = enriched[:limit]

    promos_by_venue: dict[int, list[PromoCode]] = {}
    if enriched:
        venue_ids = [v.id for v, _ in enriched]
        promos = (
            await db.execute(
                select(PromoCode).where(
                    PromoCode.venue_id.in_(venue_ids),
                    PromoCode.is_active.is_(True),
                )
            )
        ).scalars().all()
        for p in promos:
            promos_by_venue.setdefault(p.venue_id, []).append(p)

    items = [
        VenueWithPromos(
            id=v.id,
            name=v.name,
            description=v.description,
            address=v.address,
            lat=v.lat,
            lng=v.lng,
            image_url=v.image_url,
            is_active=v.is_active,
            promos=[PromoOut.model_validate(p) for p in promos_by_venue.get(v.id, [])],
            distance_km=round(d, 2),
        )
        for v, d in enriched
    ]
    return MatchVenueRecommendation(
        midpoint_lat=mid_lat, midpoint_lng=mid_lng, items=items
    )
