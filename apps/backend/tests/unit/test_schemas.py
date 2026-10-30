"""Unit tests for schema defaults and helpers."""

from app.schemas.models import normalize_resume_data, ResumeDiffSummary


def test_normalize_resume_data_additional_heading_is_skills() -> None:
    """normalize_resume_data must default the additional section to 'Skills'."""
    result = normalize_resume_data({})
    additional_meta = next(
        (s for s in result["sectionMeta"] if s["key"] == "additional"),
        None,
    )
    assert additional_meta is not None
    assert additional_meta["displayName"] == "Skills"


def test_normalize_resume_data_migrates_legacy_additional_heading() -> None:
    """A legacy 'Skills & Awards' heading is rewritten to the new default."""
    existing_meta = [{"key": "additional", "displayName": "Skills & Awards"}]
    result = normalize_resume_data({"sectionMeta": existing_meta})
    assert result["sectionMeta"][0]["displayName"] == "Skills"


def test_normalize_resume_data_preserves_existing_section_meta() -> None:
    """normalize_resume_data must not overwrite sectionMeta that is already set."""
    existing_meta = [{"key": "additional", "displayName": "Custom Label"}]
    result = normalize_resume_data({"sectionMeta": existing_meta})
    assert result["sectionMeta"] == existing_meta


def test_diff_summary_awards_and_languages_default_to_zero() -> None:
    """ResumeDiffSummary new counters default to 0 so existing callers need no change."""
    summary = ResumeDiffSummary(
        total_changes=0,
        skills_added=0,
        skills_removed=0,
        descriptions_modified=0,
        certifications_added=0,
        high_risk_changes=0,
    )
    assert summary.awards_added == 0
    assert summary.languages_added == 0
