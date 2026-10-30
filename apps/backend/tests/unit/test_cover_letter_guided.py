"""Unit tests for the guided cover letter service function."""

from typing import Any

import pytest

from app.services import cover_letter
from app.services.cover_letter import generate_cover_letter_guided

FULL_CONTEXT: dict[str, Any] = {
    "company_connection": "I admire your open-source work",
    "hero_achievement": "Cut deploy time by 80 percent",
    "missing_link": "Used Rust in side projects",
    "career_narrative": "Moving from backend into platform",
    "font_style": "Georgia",
    "font_size": "11pt",
    "job_title": "Staff Platform Engineer",
    "company_name": "Acme",
}

RESUME_DATA: dict[str, Any] = {"personalInfo": {"name": "Jane Doe"}}
JOB_DESCRIPTION = "We need a platform engineer."


def _capture_prompt(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    """Monkeypatch complete() to capture the prompt and return a fixed result."""
    captured: dict[str, str] = {}

    async def fake_complete(prompt: str, **kwargs: Any) -> str:
        captured["prompt"] = prompt
        return "generated cover letter"

    monkeypatch.setattr(cover_letter, "complete", fake_complete)
    return captured


async def test_formats_prompt_with_full_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = _capture_prompt(monkeypatch)

    await generate_cover_letter_guided(RESUME_DATA, JOB_DESCRIPTION, FULL_CONTEXT)

    assert "Staff Platform Engineer" in captured["prompt"]
    assert "Cut deploy time by 80 percent" in captured["prompt"]
    assert "User Feedback" not in captured["prompt"]


async def test_includes_feedback_when_provided(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = _capture_prompt(monkeypatch)

    await generate_cover_letter_guided(
        RESUME_DATA,
        JOB_DESCRIPTION,
        FULL_CONTEXT,
        feedback="Make paragraph 2 more technical",
    )

    assert "User Feedback" in captured["prompt"]
    assert "Make paragraph 2 more technical" in captured["prompt"]


async def test_returns_stripped_result(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_complete(prompt: str, **kwargs: Any) -> str:
        return "  cover letter text  "

    monkeypatch.setattr(cover_letter, "complete", fake_complete)

    result = await generate_cover_letter_guided(
        RESUME_DATA, JOB_DESCRIPTION, FULL_CONTEXT
    )

    assert result == "cover letter text"


async def test_raises_on_oversized_job_description(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _capture_prompt(monkeypatch)

    with pytest.raises(ValueError, match="exceeds"):
        await generate_cover_letter_guided(
            RESUME_DATA, "x" * 200_001, FULL_CONTEXT
        )
