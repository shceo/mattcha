from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _ext(filename: str | None) -> str:
    if not filename or "." not in filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "filename without extension")
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"unsupported extension; allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )
    return ext


async def save_user_photo(user_id: int, upload: UploadFile) -> str:
    """Persist `upload` under uploads/{user_id}/. Returns the relative path stored in DB."""
    ext = _ext(upload.filename)
    base = Path(settings.uploads_dir) / str(user_id)
    base.mkdir(parents=True, exist_ok=True)

    name = f"{secrets.token_urlsafe(12)}.{ext}"
    target = base / name

    size = 0
    with target.open("wb") as fp:
        while chunk := await upload.read(1024 * 64):
            size += len(chunk)
            if size > MAX_BYTES:
                fp.close()
                target.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    f"file exceeds {MAX_BYTES // (1024 * 1024)} MB",
                )
            fp.write(chunk)

    return f"{user_id}/{name}"


def url_for_path(path: str) -> str:
    return f"/uploads/{path}"
