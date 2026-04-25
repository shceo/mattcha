from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.profile import Gender
from app.models.user import UserRole


class AdminUserListItem(BaseModel):
    id: int
    email: str | None
    phone: str | None
    role: UserRole
    is_banned: bool
    created_at: datetime
    has_profile: bool
    full_name: str | None
    gender: Gender | None
    age: int | None
    primary_photo_url: str | None


class AdminUsersPage(BaseModel):
    items: list[AdminUserListItem]
    total: int
