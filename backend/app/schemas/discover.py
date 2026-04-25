from __future__ import annotations

from pydantic import BaseModel

from app.models.profile import Gender


class DiscoverCard(BaseModel):
    user_id: int
    full_name: str
    gender: Gender
    age: int
    occupation: str | None
    life_goals: str | None
    address: str | None
    distance_km: float | None
    primary_photo_url: str | None


class DiscoverPage(BaseModel):
    items: list[DiscoverCard]
    next_offset: int | None
