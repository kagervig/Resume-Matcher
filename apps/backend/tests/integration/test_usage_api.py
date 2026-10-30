"""Integration tests for the usage/stats/rating and OpenRouter-models endpoints."""

from typing import Any

import httpx
import respx
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import openrouter as openrouter_service
from app.services import usage


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _record(db: Any, **overrides: Any) -> None:
    defaults = dict(
        id=overrides.pop("id"),
        provider="openrouter",
        model="anthropic/claude-3.7-sonnet",
        feature="improve",
        request_id=None,
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        cost_usd=0.01,
        latency_ms=1000,
    )
    defaults.update(overrides)
    db.record_llm_call(**defaults)


async def test_get_session_usage_returns_snapshot(isolated_db: Any) -> None:
    usage.reset_session()
    async with _client() as client:
        response = await client.get("/api/v1/usage/session")
    assert response.status_code == 200
    body = response.json()
    assert body["calls"] == 0
    assert body["cost_usd"] == 0.0


async def test_reset_session_zeroes_the_total(isolated_db: Any) -> None:
    usage.record_cost(0.5)
    async with _client() as client:
        response = await client.post("/api/v1/usage/session/reset")
    assert response.status_code == 200
    assert response.json()["cost_usd"] == 0.0


async def test_usage_stats_lists_recorded_models(isolated_db: Any) -> None:
    _record(isolated_db, id="a")
    async with _client() as client:
        response = await client.get("/api/v1/usage/stats")
    assert response.status_code == 200
    models = response.json()["models"]
    assert any(m["model"] == "anthropic/claude-3.7-sonnet" for m in models)


async def test_rating_updates_matching_calls(isolated_db: Any) -> None:
    _record(isolated_db, id="a", request_id="req-1")
    async with _client() as client:
        response = await client.post(
            "/api/v1/usage/rating", json={"request_id": "req-1", "rating": "good"}
        )
    assert response.status_code == 200
    assert response.json()["updated"] == 1


async def test_rating_unknown_request_returns_404(isolated_db: Any) -> None:
    async with _client() as client:
        response = await client.post(
            "/api/v1/usage/rating", json={"request_id": "nope", "rating": "bad"}
        )
    assert response.status_code == 404


async def test_openrouter_models_endpoint_maps_payload(isolated_db: Any) -> None:
    openrouter_service._cache["models"] = []
    openrouter_service._cache["fetched_at"] = 0.0
    payload = {
        "data": [
            {
                "id": "anthropic/claude-3.7-sonnet",
                "name": "Anthropic: Claude 3.7 Sonnet",
                "pricing": {"prompt": "0.000003", "completion": "0.000015"},
            }
        ]
    }
    with respx.mock:
        respx.get("https://openrouter.ai/api/v1/models").mock(
            return_value=httpx.Response(200, json=payload)
        )
        async with _client() as client:
            response = await client.get("/api/v1/config/openrouter-models")

    assert response.status_code == 200
    models = response.json()["models"]
    assert models[0]["id"] == "anthropic/claude-3.7-sonnet"
    assert models[0]["prompt_price"] == 0.000003
