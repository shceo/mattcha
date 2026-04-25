"""Promote a user to admin by email or phone.

Usage:
    python -m scripts.make_admin user@example.com
    python -m scripts.make_admin +998901234567
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import or_, select

from app.db import SessionLocal
from app.models.user import User, UserRole


async def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    ident = sys.argv[1].strip()
    async with SessionLocal() as db:
        u = (
            await db.execute(
                select(User).where(or_(User.email == ident, User.phone == ident))
            )
        ).scalar_one_or_none()
        if not u:
            print(f"user {ident!r} not found")
            return 1
        if u.role == UserRole.admin:
            print(f"user {u.id} ({ident}) already admin")
            return 0
        u.role = UserRole.admin
        await db.commit()
        print(f"user {u.id} ({ident}) promoted to admin")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
