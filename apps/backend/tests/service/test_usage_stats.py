"""Service tests for per-model stats aggregation and rating updates."""

from typing import Any


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


async def test_model_stats_aggregates_per_model(isolated_db: Any) -> None:
    _record(isolated_db, id="a", cost_usd=0.01, latency_ms=1000)
    _record(isolated_db, id="b", cost_usd=0.03, latency_ms=3000)
    _record(isolated_db, id="c", model="openai/gpt-4o", cost_usd=0.05, latency_ms=2000)

    stats = await isolated_db.get_model_stats()
    by_model = {row["model"]: row for row in stats}

    sonnet = by_model["anthropic/claude-3.7-sonnet"]
    assert sonnet["count"] == 2
    assert round(sonnet["total_cost_usd"], 4) == 0.04
    assert sonnet["avg_latency_ms"] == 2000

    assert by_model["openai/gpt-4o"]["count"] == 1


async def test_model_stats_counts_ratings(isolated_db: Any) -> None:
    _record(isolated_db, id="a", request_id="req-1")
    _record(isolated_db, id="b", request_id="req-2")
    await isolated_db.set_llm_call_rating("req-1", "good")
    await isolated_db.set_llm_call_rating("req-2", "bad")

    row = (await isolated_db.get_model_stats())[0]
    assert row["good_count"] == 1
    assert row["bad_count"] == 1


async def test_set_rating_updates_all_rows_for_request(isolated_db: Any) -> None:
    _record(isolated_db, id="a", request_id="req-9")
    _record(isolated_db, id="b", request_id="req-9")

    updated = await isolated_db.set_llm_call_rating("req-9", "good")
    assert updated == 2


async def test_set_rating_unknown_request_updates_nothing(isolated_db: Any) -> None:
    updated = await isolated_db.set_llm_call_rating("missing", "good")
    assert updated == 0
