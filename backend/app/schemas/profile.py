from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.profile import Gender


class ProfileCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    gender: Gender
    birth_date: date
    occupation: str | None = Field(default=None, max_length=200)
    life_goals: str | None = Field(default=None, max_length=2000)
    address: str | None = Field(default=None, max_length=255)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class ProfileUpdate(BaseModel):
    """Update payload — gender intentionally absent and rejected at the API layer."""

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    birth_date: date | None = None
    occupation: str | None = Field(default=None, max_length=200)
    life_goals: str | None = Field(default=None, max_length=2000)
    address: str | None = Field(default=None, max_length=255)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    show_online: bool | None = None


class PhotoOut(BaseModel):
    id: int
    url: str
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class ProfileOut(BaseModel):
    user_id: int
    full_name: str
    gender: Gender
    birth_date: date
    age: int
    occupation: str | None
    life_goals: str | None
    address: str | None
    lat: float | None
    lng: float | None
    show_online: bool
    last_seen_at: datetime | None
    photos: list[PhotoOut] = []

    model_config = {"from_attributes": True}


class PublicProfileOut(BaseModel):
    """Profile shape exposed when one user views another. No coords, no birth_date."""

    user_id: int
    full_name: str
    gender: Gender
    age: int
    occupation: str | None
    life_goals: str | None
    address: str | None
    last_seen_at: datetime | None
    photos: list[PhotoOut] = []
