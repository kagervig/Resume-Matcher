"""Unit tests for the JD summary service (LLM boundary mocked)."""

from unittest.mock import AsyncMock, patch

from app.services.jd_summary import _validate_summary_result, summarize_job_description


class TestValidateSummaryResult:
    def test_coerces_and_trims_fields(self) -> None:
        result = _validate_summary_result(
            {
                "summary": "  Build backend services.  ",
                "core_competencies": [" Python ", "", "APIs", 42],
            }
        )
        assert result["summary"] == "Build backend services."
        assert result["core_competencies"] == ["Python", "APIs"]

    def test_missing_fields_become_empty(self) -> None:
        result = _validate_summary_result({})
        assert result == {"summary": "", "core_competencies": []}

    def test_caps_core_competencies_at_six(self) -> None:
        result = _validate_summary_result(
            {"summary": "x", "core_competencies": [f"c{i}" for i in range(10)]}
        )
        assert len(result["core_competencies"]) == 6


class TestSummarizeJobDescription:
    @patch("app.services.jd_summary.complete_json", new_callable=AsyncMock)
    async def test_returns_summary_and_competencies(self, mock_llm: AsyncMock) -> None:
        mock_llm.return_value = {
            "summary": "A senior backend role building Python APIs.",
            "core_competencies": ["Python", "API design"],
        }
        result = await summarize_job_description("Senior Backend Engineer. Python, FastAPI.")
        assert result["summary"] == "A senior backend role building Python APIs."
        assert result["core_competencies"] == ["Python", "API design"]
        assert mock_llm.await_count == 1
