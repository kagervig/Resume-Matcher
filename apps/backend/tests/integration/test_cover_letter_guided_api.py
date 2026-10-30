"""ASGI contract tests for the guided cover letter endpoint."""

import copy
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import app
from app.routers import resumes


@pytest.fixture
def client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _tailored_resume(
    database: Database,
    sample_resume: dict[str, Any],
) -> str:
    """Create a tailored resume with a job and improvement record; return its id."""
    master = await database.create_resume(
        content="# Master resume",
        processed_data=copy.deepcopy(sample_resume),
        processing_status="ready",
        is_master=True,
    )
    tailored = await database.create_resume(
        content="# Tailored resume",
        processed_data=copy.deepcopy(sample_resume),
        processing_status="ready",
        parent_id=master["resume_id"],
    )
    job = await database.create_job(content="We need a platform engineer.")
    await database.create_improvement(
        original_resume_id=master["resume_id"],
        tailored_resume_id=tailored["resume_id"],
        job_id=job["job_id"],
        improvements=[],
    )
    return tailored["resume_id"]


def _request_body() -> dict[str, Any]:
    return {
        "context": {
            "company_connection": "I admire your platform work",
            "hero_achievement": "Cut deploy time by 80 percent",
            "missing_link": "Used Rust in side projects",
            "career_narrative": "Moving into platform engineering",
            "font_style": "Georgia",
            "font_size": "11pt",
            "job_title": "Staff Platform Engineer",
            "company_name": "Acme",
        }
    }


def _stub_generate(monkeypatch: pytest.MonkeyPatch, result: str) -> None:
    async def fake_guided(*args: Any, **kwargs: Any) -> str:
        return result

    monkeypatch.setattr(resumes, "generate_cover_letter_guided", fake_guided)


async def test_requires_context_on_first_call(
    client: AsyncClient,
    isolated_db: Database,
    sample_resume: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _stub_generate(monkeypatch, "letter")
    resume_id = await _tailored_resume(isolated_db, sample_resume)

    response = await client.post(f"/api/v1/resumes/{resume_id}/cover-letter/generate")

    assert response.status_code == 400


async def test_saves_context_and_returns_content(
    client: AsyncClient,
    isolated_db: Database,
    sample_resume: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _stub_generate(monkeypatch, "Generated cover letter body")
    resume_id = await _tailored_resume(isolated_db, sample_resume)

    response = await client.post(
        f"/api/v1/resumes/{resume_id}/cover-letter/generate",
        json=_request_body(),
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Generated cover letter body"

    stored = await isolated_db.get_resume(resume_id)
    assert stored["cover_letter_context"] is not None


async def test_reuses_stored_context_on_second_call(
    client: AsyncClient,
    isolated_db: Database,
    sample_resume: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _stub_generate(monkeypatch, "letter")
    resume_id = await _tailored_resume(isolated_db, sample_resume)

    first = await client.post(
        f"/api/v1/resumes/{resume_id}/cover-letter/generate",
        json=_request_body(),
    )
    assert first.status_code == 200

    second = await client.post(
        f"/api/v1/resumes/{resume_id}/cover-letter/generate"
    )
    assert second.status_code == 200
