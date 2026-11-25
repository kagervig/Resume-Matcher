"""Integration test for GET /resumes/experience-suggestions."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import app


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def test_suggests_companies_and_titles_from_resume(
    client: AsyncClient, isolated_db: Database
) -> None:
    await isolated_db.create_resume_atomic_master(
        content="r",
        processing_status="ready",
        title="track",
        processed_data={
            "personalInfo": {"name": "A"},
            "workExperience": [{"title": "Backend Engineer", "company": "Acme"}],
        },
    )

    res = await client.get("/api/v1/resumes/experience-suggestions")

    assert res.status_code == 200
    body = res.json()
    assert "Acme" in body["companies"]
    assert "Backend Engineer" in body["titles"]


async def test_returns_empty_lists_when_no_data(
    client: AsyncClient, isolated_db: Database
) -> None:
    res = await client.get("/api/v1/resumes/experience-suggestions")

    assert res.status_code == 200
    assert res.json() == {"companies": [], "titles": []}
