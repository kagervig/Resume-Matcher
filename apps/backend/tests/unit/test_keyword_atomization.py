"""Unit tests for _atomize_keyword_list — JD keywords must be atomic, not sentences."""

from app.services.improver import _atomize_keyword_list, _validate_keyword_result


class TestAtomizeKeywordList:
    """Enumerated requirement lines split into discrete, matchable skills."""

    def test_splits_such_as_enumeration_into_atomic_skills(self):
        result = _atomize_keyword_list(
            [
                "Proficiency in at least one programming language, "
                "such as C, C++, Java, Python, or Go"
            ]
        )
        assert result == ["C", "C++", "Java", "Python", "Go"]

    def test_splits_bare_comma_list(self):
        assert _atomize_keyword_list(["React, Redux, TypeScript"]) == [
            "React",
            "Redux",
            "TypeScript",
        ]

    def test_preserves_slashed_and_short_multiword_skills(self):
        result = _atomize_keyword_list(["CI/CD", "machine learning", "AWS"])
        assert result == ["CI/CD", "machine learning", "AWS"]

    def test_dedupes_case_insensitively_keeping_first_casing(self):
        assert _atomize_keyword_list(["Python", "python", "PYTHON"]) == ["Python"]

    def test_drops_sentence_like_fragment_without_enumeration(self):
        # No enumeration markers and clearly a sentence → not a usable keyword.
        assert _atomize_keyword_list(
            ["Ability to communicate effectively with stakeholders at all levels"]
        ) == []

    def test_ignores_non_string_and_blank_entries(self):
        assert _atomize_keyword_list(["Python", "", None, 5]) == ["Python"]

    def test_non_list_input_returns_empty(self):
        assert _atomize_keyword_list("Python") == []


class TestValidateKeywordResultAtomizes:
    """The validator applies atomization to the skill/keyword fields."""

    def test_required_skills_are_atomized(self):
        validated = _validate_keyword_result(
            {
                "required_skills": ["Experience with Java, Python, or Go"],
                "preferred_skills": [],
                "keywords": [],
            }
        )
        assert validated["required_skills"] == ["Java", "Python", "Go"]
