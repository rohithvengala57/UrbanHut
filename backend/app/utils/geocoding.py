from __future__ import annotations

from typing import Final

import httpx
import structlog

log = structlog.get_logger("app.utils.geocoding")

_GEOCODER_URL: Final[str] = "https://nominatim.openstreetmap.org/search"
_USER_AGENT: Final[str] = "UrbanHut/0.1 (local-development)"


def _build_query(
    address_line1: str,
    city: str,
    state: str,
    zip_code: str,
    address_line2: str | None = None,
) -> str:
    parts = [
        address_line1.strip(),
        (address_line2 or "").strip(),
        city.strip(),
        state.strip(),
        zip_code.strip(),
    ]
    return ", ".join(part for part in parts if part)


async def geocode_address(
    address_line1: str,
    city: str,
    state: str,
    zip_code: str,
    address_line2: str | None = None,
) -> tuple[float, float] | None:
    query = _build_query(address_line1, city, state, zip_code, address_line2)
    if not query:
        log.warning("geocoding_skipped", reason="empty_query")
        return None

    log.info(
        "geocoding_started",
        city=city,
        state=state,
        zip_code=zip_code,
        # Don't log full street address (PII) — city/state/zip is enough for debugging
    )

    try:
        async with httpx.AsyncClient(
            timeout=5.0,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            response = await client.get(
                _GEOCODER_URL,
                params={
                    "q": query,
                    "format": "jsonv2",
                    "limit": 1,
                },
            )
            response.raise_for_status()

    except httpx.TimeoutException as exc:
        log.warning(
            "geocoding_timeout",
            city=city,
            state=state,
            timeout_seconds=5.0,
            error=str(exc),
        )
        return None
    except httpx.HTTPStatusError as exc:
        log.error(
            "geocoding_http_error",
            city=city,
            state=state,
            status_code=exc.response.status_code,
            error=str(exc),
        )
        return None
    except httpx.HTTPError as exc:
        log.error(
            "geocoding_request_failed",
            city=city,
            state=state,
            exc_type=type(exc).__name__,
            error=str(exc),
        )
        return None

    results = response.json()
    if not results:
        log.warning(
            "geocoding_no_results",
            city=city,
            state=state,
            zip_code=zip_code,
        )
        return None

    first = results[0]
    try:
        lat = float(first["lat"])
        lon = float(first["lon"])
        log.info(
            "geocoding_success",
            city=city,
            state=state,
            lat=round(lat, 4),
            lon=round(lon, 4),
        )
        return lat, lon
    except (KeyError, TypeError, ValueError) as exc:
        log.error(
            "geocoding_response_parse_failed",
            city=city,
            state=state,
            error=str(exc),
            response_keys=list(first.keys()) if isinstance(first, dict) else None,
        )
        return None
