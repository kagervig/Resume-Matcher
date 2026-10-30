"""Live OpenRouter model-list fetch with a short in-process cache.

Fetched server-side (not from the browser) so the model dropdown works without
a CORS exception or exposing a key, and to match the app convention that all
backend access flows through our API. The list is public and needs no key.
"""

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_MODELS_URL = "https://openrouter.ai/api/v1/models"
_CACHE_TTL_SECONDS = 3600
_HTTP_TIMEOUT_SECONDS = 15.0

_cache: dict[str, Any] = {"fetched_at": 0.0, "models": []}


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _map_model(entry: dict[str, Any]) -> dict[str, Any]:
    pricing = entry.get("pricing") or {}
    return {
        "id": entry.get("id", ""),
        "name": entry.get("name") or entry.get("id", ""),
        # OpenRouter prices are USD per token, as strings.
        "prompt_price": _to_float(pricing.get("prompt")),
        "completion_price": _to_float(pricing.get("completion")),
    }


async def fetch_openrouter_models() -> list[dict[str, Any]]:
    """Return mapped OpenRouter models, served from cache when fresh.

    On a fetch error any cached list is returned (even if stale); if the cache
    is empty the error propagates so the endpoint can surface it.
    """
    now = time.monotonic()
    if _cache["models"] and now - _cache["fetched_at"] < _CACHE_TTL_SECONDS:
        return _cache["models"]

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.get(_MODELS_URL)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("OpenRouter model fetch failed: %s", exc)
        if _cache["models"]:
            return _cache["models"]
        raise

    models = [_map_model(entry) for entry in payload.get("data", []) if entry.get("id")]
    _cache["models"] = models
    _cache["fetched_at"] = now
    return models
