"""Job-description summary generation service.

Produces a short, digestible digest of a job description: a 1-2 sentence
summary and the core competencies the role requires. Keywords are sourced
separately from the already-extracted ``job_keywords`` (see the router), so
this service makes a single LLM call that never re-derives them.
"""

from typing import Any

from app.llm import complete_json
from app.prompts import SUMMARIZE_JD_PROMPT
from app.services.improver import _sanitize_user_input

_MAX_CORE_COMPETENCIES = 6


def _validate_summary_result(result: dict[str, Any]) -> dict[str, Any]:
    """Coerce the LLM output to ``{summary, core_competencies}``.

    Tolerates missing or mistyped fields so a partial response still yields a
    usable record rather than raising.
    """
    raw_summary = result.get("summary")
    summary = raw_summary.strip() if isinstance(raw_summary, str) else ""

    raw_competencies = result.get("core_competencies")
    competencies = [
        item.strip()
        for item in (raw_competencies if isinstance(raw_competencies, list) else [])
        if isinstance(item, str) and item.strip()
    ]
    return {
        "summary": summary,
        "core_competencies": competencies[:_MAX_CORE_COMPETENCIES],
    }


async def summarize_job_description(job_description: str) -> dict[str, Any]:
    """Summarize a job description into ``{summary, core_competencies}``.

    Args:
        job_description: Raw job description text.

    Returns:
        A dict with a plain-language ``summary`` and a capped list of
        ``core_competencies``.
    """
    # LLM-011: Sanitize job description before using in prompt.
    sanitized_jd = _sanitize_user_input(job_description)
    prompt = SUMMARIZE_JD_PROMPT.format(job_description=sanitized_jd)

    result = await complete_json(
        prompt=prompt,
        system_prompt="You are an expert job description analyzer.",
        schema_type="keywords",
        response_validator=_validate_summary_result,
    )
    return _validate_summary_result(result)
