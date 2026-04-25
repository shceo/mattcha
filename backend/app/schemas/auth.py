from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterIn(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def _phone_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        cleaned = v.strip().replace(" ", "")
        if not cleaned.startswith("+") or not cleaned[1:].isdigit() or len(cleaned) < 7:
            raise ValueError("phone must be E.164 like +998901234567")
        return cleaned

    @model_validator(mode="after")
    def _exactly_one_identifier(self) -> "RegisterIn":
        if bool(self.email) == bool(self.phone):
            raise ValueError("provide exactly one of email or phone")
        return self


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str | None
    phone: str | None
    role: str
    is_banned: bool

    model_config = {"from_attributes": True}
