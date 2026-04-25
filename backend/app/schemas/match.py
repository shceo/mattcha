from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.match import MatchStatus
from app.models.profile import Gender


class CounterpartCard(BaseModel):
    user_id: int
    full_name: str
    gender: Gender
    age: int
    primary_photo_url: str | None
    address: str | None


class MatchOut(BaseModel):
    id: int
    initiator_id: int
    recipient_id: int
    status: MatchStatus
    quota_limit: int | None
    quota_used: int
    quota_remaining: int | None
    matched_at: datetime | None
    created_at: datetime
    am_initiator: bool
    counterpart: CounterpartCard


class MessageOut(BaseModel):
    id: int
    sender_id: int
    body: str
    created_at: datetime


class MessagesPage(BaseModel):
    items: list[MessageOut]


class MessageCreateIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ExtendIn(BaseModel):
    add: int | None = Field(default=None, ge=1, le=500)
    unlimited: bool = False

    @model_validator(mode="after")
    def _exactly_one(self) -> "ExtendIn":
        if self.unlimited and self.add is not None:
            raise ValueError("provide either 'add' or 'unlimited', not both")
        if not self.unlimited and self.add is None:
            raise ValueError("provide either 'add' or 'unlimited'")
        return self


class MatchListItem(BaseModel):
    id: int
    status: MatchStatus
    quota_limit: int | None
    quota_used: int
    matched_at: datetime | None
    last_message_at: datetime | None
    last_message_preview: str | None
    am_initiator: bool
    counterpart: CounterpartCard
