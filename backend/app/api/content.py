from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.site_content import SiteContent

router = APIRouter(prefix="/content", tags=["content"])

ALLOWED_LOCALES = {"ru", "en", "uz"}


@router.get("/landing/{locale}")
async def get_landing(
    locale: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict | None:
    """Public read. Returns the stored payload or null if no override exists."""
    if locale not in ALLOWED_LOCALES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown locale")
    row = (
        await db.execute(select(SiteContent).where(SiteContent.locale == locale))
    ).scalar_one_or_none()
    if not row:
        return None
    return row.payload
