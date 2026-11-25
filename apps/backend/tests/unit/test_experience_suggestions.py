"""Unit tests for build_experience_suggestions aggregation."""

from app.services.experience_suggestions import build_experience_suggestions


def _resume(work_experience: list[dict]) -> dict:
    return {"processed_data": {"workExperience": work_experience}}


class TestBuildExperienceSuggestions:
    def test_merges_resumes_and_applications_distinctly(self):
        resumes = [
            _resume(
                [
                    {"title": "Backend Engineer", "company": "Acme"},
                    {"title": "Intern", "company": "Globex"},
                ]
            )
        ]
        applications = [{"role": "Platform Engineer", "company": "Initech"}]

        result = build_experience_suggestions(resumes, applications)

        assert result["companies"] == ["Acme", "Globex", "Initech"]
        assert result["titles"] == ["Backend Engineer", "Intern", "Platform Engineer"]

    def test_dedupes_case_insensitively_keeping_first_casing(self):
        resumes = [_resume([{"title": "Engineer", "company": "Acme"}])]
        applications = [{"role": "engineer", "company": "ACME"}]

        result = build_experience_suggestions(resumes, applications)

        assert result["companies"] == ["Acme"]
        assert result["titles"] == ["Engineer"]

    def test_skips_blanks_and_malformed_entries(self):
        resumes = [
            _resume([{"title": "", "company": "  "}, "not a dict", {"company": "Acme"}])
        ]
        applications = [{"role": None, "company": "Globex"}]

        result = build_experience_suggestions(resumes, applications)

        assert result["companies"] == ["Acme", "Globex"]
        assert result["titles"] == []

    def test_handles_missing_processed_data(self):
        result = build_experience_suggestions([{"processed_data": None}], [])
        assert result == {"companies": [], "titles": []}
