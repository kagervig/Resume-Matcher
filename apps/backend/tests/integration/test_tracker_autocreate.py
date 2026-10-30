"""The tailor flow auto-creates a tracker card (best-effort, non-blocking).

Drives a real ``/improve/preview`` → ``/improve/confirm`` round trip (every LLM
boundary mocked, exactly like ``test_pipeline_e2e``) and asserts an ``applied``
card lands on the board carrying the LLM-extracted company/role — with zero
extra LLM call on the confirm path (company/role come from the cached job).
"""

import copy
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import app
from app.schemas.models import ResumeData
from tests.integration.test_pipeline_e2e import _upload_resume


def _new_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def _preview_then_confirm(
    isolated_db: Database,
    sample_resume: dict[str, Any],
    confirm_count: int = 1,
    company: str | None = None,
    role: str | None = None,
) -> tuple[str, str, str]:
    """Run the mocked preview→confirm handshake; return the tailored resume id."""
    upload_resp = await _upload_resume(isolated_db, sample_resume)
    resume_id = upload_resp.json()["resume_id"]

    job_payload: dict[str, Any] = {
        "job_descriptions": ["Senior Backend Engineer at Acme Corp: Python, FastAPI."]
    }
    if company is not None:
        job_payload["company"] = company
    if role is not None:
        job_payload["role"] = role
    async with _new_client() as client:
        jobs_resp = await client.post("/api/v1/jobs/upload", json=job_payload)
    job_id = jobs_resp.json()["job_id"][0]

    improved = ResumeData.model_validate(copy.deepcopy(sample_resume)).model_dump()
    improved["summary"] = (
        "Senior backend engineer building scalable Python and FastAPI services."
    )

    with (
        patch(
            "app.routers.resumes.extract_job_keywords",
            new_callable=AsyncMock,
            return_value={
                "keywords": ["Python", "FastAPI"],
                "required_skills": [],
                "company": "Acme Corp",
                "role": "Senior Backend Engineer",
            },
        ),
        patch(
            "app.routers.resumes.generate_skill_target_plan",
            new_callable=AsyncMock,
            return_value={"accepted": [], "rejected": []},
        ),
        patch(
            "app.routers.resumes.verify_skill_target_plan",
            return_value={"accepted": [], "rejected": []},
        ),
        patch(
            "app.routers.resumes.generate_resume_diffs",
            new_callable=AsyncMock,
            return_value=SimpleNamespace(changes=[]),
        ),
        patch(
            "app.routers.resumes.apply_diffs",
            return_value=(copy.deepcopy(improved), [], []),
        ),
        patch("app.routers.resumes.verify_diff_result", return_value=[]),
        patch(
            "app.routers.resumes.refine_resume",
            new_callable=AsyncMock,
            side_effect=RuntimeError("refinement disabled for test"),
        ),
        patch(
            "app.routers.resumes.generate_resume_title",
            new_callable=AsyncMock,
            return_value="Senior Backend Engineer - Acme Corp",
        ),
    ):
        async with _new_client() as client:
            preview_resp = await client.post(
                "/api/v1/resumes/improve/preview",
                json={"resume_id": resume_id, "job_id": job_id},
            )
        assert preview_resp.status_code == 200, preview_resp.text
        preview_data = preview_resp.json()["data"]

        responses: list[dict[str, Any]] = []
        async with _new_client() as client:
            for _ in range(confirm_count):
                confirm_resp = await client.post(
                    "/api/v1/resumes/improve/confirm",
                    json={
                        "resume_id": resume_id,
                        "job_id": job_id,
                        "preview_id": preview_data["preview_id"],
                        "improved_data": preview_data["resume_preview"],
                        "improvements": preview_data["improvements"],
                    },
                )
                assert confirm_resp.status_code == 200, confirm_resp.text
                responses.append(confirm_resp.json())
        assert all(response == responses[0] for response in responses)

    return resume_id, job_id, confirm_resp.json()["data"]["resume_id"]


class TestTrackerAutoCreate:
    async def test_confirm_creates_saved_card(
        self, isolated_db: Database, sample_resume: dict[str, Any]
    ) -> None:
        resume_id, job_id, tailored_id = await _preview_then_confirm(
            isolated_db, sample_resume
        )

        async with _new_client() as client:
            board = (await client.get("/api/v1/applications")).json()["columns"]

        # The card starts pending in the saved column, not applied.
        assert len(board["applied"]) == 0
        saved = board["saved"]
        assert len(saved) == 1
        card = saved[0]
        # Card points at the tailored (applied) resume and the master.
        assert card["resume_id"] == tailored_id
        assert card["master_resume_id"] == resume_id
        assert card["job_id"] == job_id
        # Company comes from the cached job; role falls back to the resume title.
        assert card["company"] == "Acme Corp"
        assert card["role"] == "Senior Backend Engineer - Acme Corp"
        assert card["applied_at"] is None

    async def test_user_typed_role_becomes_title_and_card_role(
        self, isolated_db: Database, sample_resume: dict[str, Any]
    ) -> None:
        # The generated title is mocked to something else; the typed role wins.
        _resume_id, _job_id, tailored_id = await _preview_then_confirm(
            isolated_db,
            sample_resume,
            company="HelloFresh",
            role="Backend Engineer, Consumer",
        )

        async with _new_client() as client:
            fetched = (
                await client.get("/api/v1/resumes", params={"resume_id": tailored_id})
            ).json()["data"]
            board = (await client.get("/api/v1/applications")).json()["columns"]

        assert fetched["title"] == "Backend Engineer, Consumer"
        card = board["saved"][0]
        assert card["company"] == "HelloFresh"
        assert card["role"] == "Backend Engineer, Consumer"

    async def test_autocreate_is_idempotent_on_double_confirm(
        self,
        isolated_db: Database,
        sample_resume: dict[str, Any],
    ) -> None:
        await _preview_then_confirm(isolated_db, sample_resume, confirm_count=2)
        async with _new_client() as client:
            board = (await client.get("/api/v1/applications")).json()["columns"]
        assert len(board["saved"]) == 1
        assert len(await isolated_db.list_resumes()) == 2


class TestJDSummary:
    async def test_summary_is_null_then_generated_and_cached(
        self, isolated_db: Database, sample_resume: dict[str, Any]
    ) -> None:
        _resume_id, _job_id, tailored_id = await _preview_then_confirm(
            isolated_db, sample_resume
        )

        async with _new_client() as client:
            # No summary exists until it is generated.
            before = await client.get(f"/api/v1/resumes/{tailored_id}/jd-summary")
            assert before.status_code == 200
            assert before.json() is None

            with patch(
                "app.routers.resumes.summarize_job_description",
                new_callable=AsyncMock,
                return_value={
                    "summary": "A senior backend role building Python APIs.",
                    "core_competencies": ["Backend API design", "Cloud infrastructure"],
                },
            ):
                generated = await client.post(
                    f"/api/v1/resumes/{tailored_id}/jd-summary"
                )
            assert generated.status_code == 200, generated.text
            payload = generated.json()
            assert payload["summary"]["summary"].startswith("A senior backend role")
            assert payload["summary"]["core_competencies"] == [
                "Backend API design",
                "Cloud infrastructure",
            ]
            # Salient keywords are reused from the job's extracted keywords.
            assert "Python" in payload["summary"]["keywords"]
            assert payload["generated_at"]

            # A second GET returns the cached record without regenerating.
            after = await client.get(f"/api/v1/resumes/{tailored_id}/jd-summary")
            assert after.status_code == 200
            assert after.json()["summary"]["summary"] == payload["summary"]["summary"]
