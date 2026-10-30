# Todo: Guided Cover Letter Wizard

See `plan.md` for full context and implementation prompts.

## Steps

- [x] **Prompt 1** — Backend: DB column + Pydantic schemas
  - `apps/backend/app/models.py` — add `cover_letter_context` JSON column
  - `apps/backend/app/schemas/models.py` — add `CoverLetterContext`, `CoverLetterGenerateRequest`, extend `ResumeFetchData`
  - Verify: `cd apps/backend && uv run pytest tests/unit/ -v`

- [x] **Prompt 2** — Backend: Guided prompt template + service function
  - `apps/backend/app/prompts/templates.py` — add `COVER_LETTER_GUIDED_PROMPT`
  - `apps/backend/app/services/cover_letter.py` — add `generate_cover_letter_guided()`
  - Verify: no tests yet (covered by Prompt 3)

- [x] **Prompt 3** — Backend: New endpoint + schema exports + tests
  - `apps/backend/app/schemas/__init__.py` — export new schemas
  - `apps/backend/app/routers/resumes.py` — add `generate_cover_letter_guided_endpoint`
  - `apps/backend/tests/unit/test_cover_letter_guided.py` — 4 unit tests
  - `apps/backend/tests/integration/test_cover_letter_guided_api.py` — 3 integration tests
  - Verify: `cd apps/backend && uv run pytest`

- [x] **Prompt 4** — Frontend: API client + i18n keys
  - `apps/frontend/lib/api/resume.ts` — add `CoverLetterContext`, `CoverLetterGenerateRequest` types + `generateCoverLetterGuided()`
  - `apps/frontend/messages/en.json` — add `coverLetter.wizard.*` keys
  - `apps/frontend/messages/{es,fr,ja,ko,pt-BR,zh}.json` — mirror all 7 locales
  - Verify: `cd apps/frontend && npm run build` (locale parity check)

- [x] **Prompt 5** — Frontend: `CoverLetterWizard` component
  - `apps/frontend/components/builder/cover-letter-wizard.tsx` — new component
  - Verify: `cd apps/frontend && npm run lint`

- [x] **Prompt 6** — Frontend: Wire wizard into `CoverLetterEditor` + tests
  - `apps/frontend/components/builder/cover-letter-editor.tsx` — add wizard state machine + feedback panel
  - `apps/frontend/components/builder/resume-builder.tsx` — pass new props to CoverLetterEditor
  - `apps/frontend/tests/cover-letter-editor-wizard.test.tsx` — 5 tests
  - Verify: `cd apps/frontend && npm run test`

- [x] **Prompt 7** — Frontend: Print page font/size params
  - `apps/frontend/app/print/cover-letter/[id]/page.tsx` — accept + apply font/fontSize search params
  - `apps/frontend/lib/api/resume.ts` — update `getCoverLetterPdfUrl()` to pass font params
  - Verify: `cd apps/frontend && npm run build`

## Final Checks

- [x] `cd apps/backend && uv run pytest` — 1845 passed (1 pre-existing PDF/Chromium flake, unrelated)
- [x] `cd apps/frontend && npm run test` — 1538 passed
- [x] `cd apps/frontend && npm run lint` — no lint errors
- [x] `cd apps/frontend && npx tsc --noEmit` — clean; i18n parity test passes (10/10)
- [ ] Manual: wizard renders, questions submit, 300-400 word letter generates
- [ ] Manual: feedback loop regenerates without resetting context
- [ ] Manual: PDF download respects font/size pref
- [ ] Manual: old "Generate Cover Letter" button on tailored resumes still works
