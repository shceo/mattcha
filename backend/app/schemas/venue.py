from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PromoOut(BaseModel):
    id: int
    code: str
    description: str | None
    discount_text: str
    is_active: bool

    model_config = {"from_attributes": True}


class VenueOut(BaseModel):
    id: int
    name: str
    description: str | None
    address: str
    lat: float
    lng: float
    image_url: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class VenueWithPromos(VenueOut):
    promos: list[PromoOut] = []
    distance_km: float | None = None


class MatchVenueRecommendation(BaseModel):
    midpoint_lat: float
    midpoint_lng: float
    items: list[VenueWithPromos]


class VenueIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    address: str = Field(min_length=1, max_length=255)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class VenueUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=4000)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class PromoIn(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    description: str | None = Field(default=None, max_length=255)
    discount_text: str = Field(min_length=1, max_length=64)
    is_active: bool = True


class PromoUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=64)
    description: str | None = Field(default=None, max_length=255)
    discount_text: str | None = Field(default=None, min_length=1, max_length=64)
    is_active: bool | None = None
