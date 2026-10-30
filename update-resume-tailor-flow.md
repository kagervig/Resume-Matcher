# Plan: Update Resume Tailor Flow

Three independent changes:

1. **Single "Technical Skills" section by default** — stop new resumes defaulting to a "Skills & Awards" heading with always-on sub-labels.
2. **Toggle the optional sub-groups** (Languages, Certifications/Training, Awards) on/off; when only one sub-group is shown, render no sub-label.
3. **Post-tailor change summary** — after tailoring, tell the user what changed, or that nothing changed and why.

> Scope note: this is a plan only. No code is changed here. File references use `path:line` as of writing and should be re-verified before editing.

---

## Current Behaviour (grounded)

### Section label + sub-labels

- The resume "additional" section renders one heading plus a **bold sub-label per populated sub-group** — `Technical Skills:`, `Languages:`, `Certifications:`, `Awards:` — in every template. Reference implementation: `apps/frontend/components/resume/resume-single-column.tsx:271-348` (the `AdditionalSection` component). The same pattern is duplicated across **10 templates**:
  - `resume-single-column.tsx`, `resume-two-column.tsx`, `resume-modern.tsx`, `resume-modern-two-column.tsx`, `resume-modern-deedy.tsx`, `resume-deedy.tsx`, `resume-clean.tsx`, `resume-latex.tsx`, `resume-vivid.tsx`, `resume-vivid-single.tsx`.
- A sub-group renders **iff it has non-empty content** (`hasContent` gate). There is no explicit on/off state — visibility is purely content-driven.
- The section **heading** comes from `sectionMeta.displayName` for the `additional` section.
  - Frontend default is already **`'Technical Skills'`** (`apps/frontend/lib/utils/section-helpers.ts:65`), localised via `resume.sections.skills` → "Technical Skills".
  - **Backend default is still `'Skills & Awards'`** (`apps/backend/app/schemas/models.py:396`, in `DEFAULT_SECTION_META`). New resumes get `sectionMeta` injected by `normalize_resume_data` (`models.py:405-417`), so they carry **"Skills & Awards"**.
  - The frontend's `localizeDefaultSectionMeta` only rewrites a name that **still equals the frontend default** (`section-helpers.ts:106`). Because the stored value is "Skills & Awards" (≠ "Technical Skills"), it is treated as a user customisation and **left as-is**. **This is the root cause of the stale label.**
- The builder's editing form for this section already edits **only Technical Skills** (`apps/frontend/components/builder/forms/additional-form.tsx` — single textarea). Languages/certs/awards are not user-editable in the builder today; they only arrive via parsing or tailoring.

### Post-tailor summary

- The tailor flow already computes a diff: `calculate_resume_diff` → `ResumeDiffSummary` + `detailed_changes` (`apps/backend/app/services/improver.py:1302`, summary built at `:1554`). Counters: `total_changes`, `skills_added`, `skills_removed`, `descriptions_modified`, `certifications_added`, `high_risk_changes`. **No awards/languages counters.**
- It is shown **before confirm** in `DiffPreviewModal` (`apps/frontend/components/tailor/diff-preview-modal.tsx`), opened from `app/(default)/tailor/page.tsx:309-315`. After `handleConfirmChanges` (`tailor/page.tsx:348`), the app navigates away — there is **no post-apply summary**.
- The backend returns `data.warnings` explaining rejected changes — e.g. `"N unsupported skill target(s) rejected"` (`resumes.py:1425`) and `"N change(s) rejected during verification"` (`resumes.py:1473`), surfaced into the response at `resumes.py:1637`. **The frontend never reads `data.warnings`.**
- A zero-change result still has a `diff_summary` object (all zeros) and an empty `detailed_changes` array, so the modal renders an **all-zeros grid with no explanation** (it does not hit the "missing diff" fallback at `tailor/page.tsx:298`).

---

## Part A — Single "Technical Skills" section + sub-group toggles

### A1. Fix the default heading (new resumes)

- Change `DEFAULT_SECTION_META` `additional.displayName` from `"Skills & Awards"` to `"Technical Skills"` in `apps/backend/app/schemas/models.py:396` so it matches the frontend default and localisation kicks in.
- **Do not** touch `apps/backend/app/services/ats_parse/checks.py:302` — the `"skills & awards"` there is an ATS heading **synonym** for parsing uploaded resumes, not a display label.
- Grep both apps for any other `"Skills & Awards"` / `"Skills and Awards"` display strings before finalising.

### A2. Suppress the sub-label when only one sub-group is visible

- In each template's `AdditionalSection`, compute how many sub-groups are **visible** (see A3) **and** non-empty. When the count is exactly 1, render that group's items **without** the bold sub-label (`Technical Skills:` etc.) — just the section heading + tags. When ≥2, keep sub-labels as today.
- **Decided: extract a shared helper.** Pull the "which groups show + whether to show sub-labels" logic into one shared component/hook (e.g. `components/resume/additional-section.tsx`, or a `useAdditionalGroups(additional, visibility)` hook) returning the ordered, filtered, visibility-resolved groups plus a `showSubLabels` boolean, then have all 10 templates consume it. Suppression rule lives in exactly one place. Each template keeps its own markup/styling but delegates the group/label decision to the helper.

### A3. Toggle Languages / Certifications / Awards on/off

**Decided: explicit visibility flags.**

- Add an optional per-sub-group visibility map to the resume data, e.g. `additional.visibility: { languages: bool; certificationsTraining: bool; awards: bool }` (technicalSkills always on). Default for new resumes: all optional groups **off**. Render shows a sub-group iff `visible && non-empty`. The builder gains a small toggle control (reuse `ToggleSwitch` from `components/ui/toggle-switch.tsx`, as in `formatting-controls.tsx`) to flip each optional group; toggling on reveals its editor textarea.
  - Rationale: true on/off independent of content; survives empty edits; matches the existing `isVisible` mental model.
  - Touches: `AdditionalInfo` schema (backend `schemas/models.py`, frontend type in `components/dashboard/resume-component.tsx`), `additional-form.tsx` (toggles + 3 new textareas), the shared `AdditionalSection` helper from A2 (respect visibility), and a migration default (see note below).

**Migration nuance (required):** existing resumes already carry languages/certs/awards content and expect them visible. The default must not hide that data. Rule: when the visibility map is **absent**, derive initial visibility from **content presence** (group visible iff non-empty). New resumes (no such content) therefore show only Technical Skills; existing populated resumes keep showing their groups until the user toggles them. Only once a map is explicitly written does it take over from content-presence.

### A4. Tests (Part A)

- Backend: assert new-resume `sectionMeta` for `additional` has `displayName == "Technical Skills"`; `normalize_resume_data` unchanged otherwise.
- Frontend: template render test — one visible group ⇒ no sub-label; two groups ⇒ sub-labels present. Builder test — toggling a group reveals its editor and marks it visible.
- i18n: no new user-facing strings expected for A1 (reuses `resume.sections.skills`). Any new toggle labels (e.g. "Languages", "Awards") must be added to **all 7** locale files to keep `tests/i18n-locale-parity.test.ts` green.

---

## Part B — Post-tailor change summary ("what changed / nothing changed + why")

**Decided: full scope — all of B1–B5 are in scope.**

Goal: after tailoring, show a clear summary. Reuse the existing `DiffPreviewModal` + diff data; close the gaps that make it read as "nothing happened".

### B1. Surface rejections (data already exists end-to-end)

- Read `pendingResult.data.warnings` in `tailor/page.tsx` and pass into `DiffPreviewModal`; render them (e.g. an info/warning list: "3 skill targets rejected as unsupported", "2 changes rejected during verification"). No backend change — `warnings` is already populated (`resumes.py:1637`).

### B2. Explicit "no changes" state

- In `DiffPreviewModal`, when `diffSummary.total_changes === 0`, render a dedicated empty state: "No changes were applied," plus the reason, drawing on `warnings` (e.g. "Your skills already cover the job's keywords," "proposed additions couldn't be verified against your resume"). Avoid the current all-zeros grid.
- Show `total_changes` prominently at the top of the summary (it exists on `ResumeDiffSummary` but isn't displayed).

### B3. Explain *why* skills/awards didn't change (in scope)

- The backend classifier `verify_skill_target_plan` (`improver.py:853`) already produces accepted/rejected skill targets **with reasons**, but only a rejected **count** is returned. Optionally extend the response to include the rejected targets + reasons and list them in the summary ("Python — not found in the job description or your resume").
- Note the **awards** reality for messaging: awards/languages/certs have **no verifier**, so `apply_diffs` drops any new/edited items and only reorders existing ones (`improver.py:440,473`). If a user asked to change awards and nothing happened, the summary should say awards aren't auto-edited by design. (Changing that is a separate product decision, out of scope here.)

### B4. Awards/languages counters (pairs with A)

- If Part A makes these groups first-class/toggleable, add `awards_*` / `languages_*` counters to `ResumeDiffSummary` (`schemas/models.py` + `calculate_resume_diff` at `improver.py:1554`) and display them, so changes to those groups are visible in the summary.

### B5. Post-apply confirmation (in scope)

- Today confirm navigates away immediately (`tailor/page.tsx:359`). Carry the summary into a post-apply banner on the destination (builder/resume view) so the "what changed" message persists after the resume opens — not only in the pre-confirm modal. Pass the summary/warnings through navigation state (or re-derive on arrival) and render a dismissible banner; the enhanced pre-confirm modal (B1–B2) remains the review surface before applying.

### B6. Tests (Part B)

- Frontend `DiffPreviewModal` tests: renders the "no changes" state when `total_changes === 0`; renders `warnings`; shows `total_changes`.
- Backend: if B3/B4 extend the response, add/adjust tests for the new fields (`calculate_resume_diff`, the preview/confirm endpoints).

---

## Suggested order

1. **A1** (backend default label) — tiny, high impact, unblocks correct heading.
2. **A2** (shared `AdditionalSection` helper + sub-label suppression) — visible fix for the "sub-labelling" complaint; creates the seam A3 needs.
3. **A3** (explicit visibility flags + toggles + migration-by-content) — wire visibility through the A2 helper.
4. **B1 + B2** (surface `warnings` + no-change state + prominent total) — frontend-only, uses existing data.
5. **B4** (awards/languages counters) — pairs with A now that those groups are first-class.
6. **B3** (per-skill rejection reasons) — backend returns reasons; summary lists them.
7. **B5** (persist summary banner post-apply) — carry the summary to the tailored resume view.

## Verification

- Backend: `cd apps/backend && uv run pytest`
- Frontend: `cd apps/frontend && npm run test`, `npm run lint`, real typecheck via `node node_modules/typescript/bin/tsc --noEmit` (note: `npx tsc` hits a decoy package in this repo), and `npm run build` for i18n parity.
- Manual: new resume shows a single **Technical Skills** section with no sub-label; toggling Languages/Awards adds them back with sub-labels; tailoring a resume shows a change summary, and a no-op tailor says so with a reason.

## Decisions (resolved)

- **A3 persistence model**: explicit per-sub-group visibility flags, with missing-map fallback to content-presence (migration-safe). ✓
- **B scope**: full — B1–B5 all in scope. ✓
- **Template refactor**: extract a shared `AdditionalSection` helper consumed by all 10 templates. ✓
- **Awards policy**: keep frozen — tailoring never auto-adds/edits awards/languages/certs; the summary explains this when relevant. ✓

## Out of scope / non-goals

- Changing the anti-fabrication policy that freezes awards/languages/certs content during tailoring (`improver.py:440,473`).
- ATS heading-synonym parsing (`ats_parse/checks.py:302`).
- The guided cover-letter wizard work (tracked separately in `plan.md`/`todo.md`).
