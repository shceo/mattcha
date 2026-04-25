from __future__ import annotations

import enum
from datetime import datetime

from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MatchStatus(str, enum.Enum):
    open = "open"
    matched = "matched"
    expired = "expired"


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("initiator_id", "recipient_id", name="uq_match_pair"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    initiator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[MatchStatus] = mapped_column(
        Enum(MatchStatus, native_enum=False, length=16),
        default=MatchStatus.open,
        nullable=False,
    )
    quota_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quota_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    matched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    initiator_last_read_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recipient_last_read_id: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    picked_venue_id: Mapped[int | None] = mapped_column(
        ForeignKey("venues.id", ondelete="SET NULL"), nullable=True
    )
    meeting_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(
        ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(
        String(16), default="text", server_default="text", nullable=False
    )
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
