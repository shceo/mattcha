from __future__ import annotations

import math


EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def midpoint(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, float]:
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    bx = math.cos(p2) * math.cos(dl)
    by = math.cos(p2) * math.sin(dl)
    pm = math.atan2(
        math.sin(p1) + math.sin(p2),
        math.sqrt((math.cos(p1) + bx) ** 2 + by**2),
    )
    lm = math.radians(lon1) + math.atan2(by, math.cos(p1) + bx)
    return math.degrees(pm), (math.degrees(lm) + 540) % 360 - 180
