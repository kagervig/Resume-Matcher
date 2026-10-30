"""Unit tests for LLM cost extraction and the session-spend accumulator."""

from typing import Any

import app.llm as llm
from app.services import usage


class _FakeResponse:
    """A completion response stand-in carrying optional provider cost."""

    def __init__(self, hidden: dict[str, Any] | None = None) -> None:
        if hidden is not None:
            self._hidden_params = hidden


def test_extract_cost_uses_litellm_calculator(monkeypatch) -> None:
    monkeypatch.setattr(llm.litellm, "completion_cost", lambda **_: 0.0042)
    assert llm._extract_cost(_FakeResponse()) == 0.0042


def test_extract_cost_falls_back_to_provider_reported_cost(monkeypatch) -> None:
    def _raise(**_: Any) -> float:
        raise RuntimeError("no model info")

    monkeypatch.setattr(llm.litellm, "completion_cost", _raise)
    response = _FakeResponse(hidden={"response_cost": 0.0123})
    assert llm._extract_cost(response) == 0.0123


def test_extract_cost_is_none_when_unknown(monkeypatch) -> None:
    monkeypatch.setattr(llm.litellm, "completion_cost", lambda **_: 0.0)
    assert llm._extract_cost(_FakeResponse(hidden={})) is None


def test_record_cost_accumulates_and_counts() -> None:
    usage.reset_session()
    usage.record_cost(0.01)
    usage.record_cost(0.02)
    snapshot = usage.session_snapshot()
    assert snapshot["calls"] == 2
    assert round(snapshot["cost_usd"], 4) == 0.03


def test_record_cost_counts_calls_with_unknown_cost() -> None:
    usage.reset_session()
    usage.record_cost(None)
    snapshot = usage.session_snapshot()
    assert snapshot["calls"] == 1
    assert snapshot["cost_usd"] == 0.0


def test_reset_session_zeroes_totals() -> None:
    usage.record_cost(0.05)
    fresh = usage.reset_session()
    assert fresh["cost_usd"] == 0.0
    assert fresh["calls"] == 0
