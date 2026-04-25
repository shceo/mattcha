from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(subject: str, ttl: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "type": token_type,
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(str(user_id), timedelta(minutes=settings.app_access_token_ttl_min), "access")


def create_refresh_token(user_id: int) -> str:
    return _create_token(str(user_id), timedelta(days=settings.app_refresh_token_ttl_days), "refresh")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
