"""Aggregate distinct company/title suggestions from the user's own data.

Feeds the resume wizard's work-experience autocomplete. Suggestions are drawn only
from the user's existing resumes (work experience) and tracker applications — no
external source.
"""

from typing import Any

_MAX_SUGGESTIONS = 200


def _add(values: dict[str, str], raw: Any) -> None:
    """Record a trimmed value under a case-insensitive key, keeping first-seen casing."""
    if isinstance(raw, str):
        text = raw.strip()
        if text:
            values.setdefault(text.casefold(), text)


def build_experience_suggestions(
    resumes: list[dict[str, Any]],
    applications: list[dict[str, Any]],
) -> dict[str, list[str]]:
    """Distinct companies and job titles from resumes' work experience + tracker cards.

    Dedupes case-insensitively (keeping first-seen casing), sorts alphabetically, and
    caps each list at ``_MAX_SUGGESTIONS``.
    """
    companies: dict[str, str] = {}
    titles: dict[str, str] = {}

    for resume in resumes:
        data = resume.get("processed_data")
        if not isinstance(data, dict):
            continue
        for entry in data.get("workExperience") or []:
            if isinstance(entry, dict):
                _add(companies, entry.get("company"))
                _add(titles, entry.get("title"))

    for application in applications:
        _add(companies, application.get("company"))
        _add(titles, application.get("role"))

    return {
        "companies": sorted(companies.values(), key=str.casefold)[:_MAX_SUGGESTIONS],
        "titles": sorted(titles.values(), key=str.casefold)[:_MAX_SUGGESTIONS],
    }
