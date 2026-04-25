from __future__ import annotations

from datetime import datetime, timezone


def utc_aware(dt: datetime | None) -> datetime | None:
    """Attach UTC tzinfo to a naive datetime.

    All values stored in our DB are written in UTC, but MySQL `DATETIME`
    does not preserve a timezone. Naive datetimes are serialized by
    Pydantic without a `Z` suffix, which JavaScript then interprets as
    *local* time. Run all outgoing datetimes through this helper so the
    JSON has an explicit `+00:00` and clients compute deltas correctly.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
