# Plan: Guided Cover Letter Wizard

## Spec Summary

Replace the current one-click "generate cover letter" flow with a guided, three-step wizard:

1. **Step 1 — Context gathering**: ask 6 questions (4 content + 2 formatting) before generating
2. **Step 2 — Generation**: produce a 300–400 word, structured cover letter (header block, RE: line, 4 paragraphs)
3. **Step 3 — Feedback loop**: let the user iterate with plain-language instructions; each regeneration incorporates all prior context + new feedback

---

## What Already Exists (do not change)

| Piece | Location |
|-------|----------|
| `generate_cover_letter()` service | `cover_letter.py` — simple 100–150 word generator |
| `COVER_LETTER_PROMPT` feature-prompt | `prompts/templates.py` — user-customisable via Settings |
| `POST /resumes/{id}/generate-cover-letter` | `routers/resumes.py` — zero-body endpoint |
| `cover_letter` + `cover_letter_signature` DB columns | `models.py` — guided output goes in same column |
| `CoverLetterEditor` textarea + `CoverLetterPreview` | `components/builder/` — keep the textarea |
| `/print/cover-letter/[id]` print page | `app/print/cover-letter/[id]/page.tsx` |

---

## Architecture Decisions

1. **New endpoint, old endpoint untouched**: `POST /resumes/{id}/cover-letter/generate` accepts a `CoverLetterGenerateRequest` body (context + optional feedback). Old endpoint kept for backward compat.
2. **Context stored on resume**: New `cover_letter_context` JSON column on `resumes` persists Q&A answers so the feedback loop can reuse them without resending.
3. **No server-side conversation history**: The frontend sends `(context + accumulated feedback)` on each regeneration. The LLM sees everything in one prompt. Simple, stateless.
4. **Font/size prefs are URL params only**: Stored in `cover_letter_context`, passed as `?font=…&fontSize=…` to `/print/cover-letter/[id]` when downloading.
5. **New prompt, separate from feature-prompt system**: `COVER_LETTER_GUIDED_PROMPT` is a new constant that cannot be overridden in Settings. Different placeholders, different flow.

---

## Implementation Prompts

Each prompt is self-contained. Execute in order: 1 → 2 → 3 → 4 → 5 → 6 → 7.

---

### Prompt 1 — Backend: DB column + Pydantic schemas

```
You are adding a guided cover letter feature to Resume Matcher (FastAPI + Next.js project).
The backend is at apps/backend/, the frontend at apps/frontend/.

## Task 1a: DB column
In apps/backend/app/models.py, add a nullable JSON column to the Resume SQLAlchemy model,
below the existing cover_letter_signature column:

    cover_letter_context: Mapped[dict | None] = mapped_column(JSON, nullable=True)

Import JSON from sqlalchemy if it is not already imported. All type hints are required.

## Task 1b: Pydantic schemas
In apps/backend/app/schemas/models.py, add two new Pydantic models at the END of the file:

    class CoverLetterContext(BaseModel):
        company_connection: str = ""     # "Why Us?" answer
        hero_achievement: str = ""       # best-fit achievement answer
        missing_link: str = ""           # skill gap bridging answer
        career_narrative: str = ""       # context for the move
        font_style: str = "Georgia"      # formatting pref
        font_size: str = "11pt"          # formatting pref
        job_title: str = ""              # for RE: line
        company_name: str = ""           # for RE: line

    class CoverLetterGenerateRequest(BaseModel):
        context: CoverLetterContext | None = None
        feedback: str = ""               # free-text improvement instructions

Also extend ResumeFetchData by adding this optional field at the end of the class:
    cover_letter_context: dict | None = None

## What NOT to do
- Do not modify any existing schema fields or existing DB columns.
- Do not touch any router, service, or test file.
- Do not add exports to __init__.py yet — that is done in Prompt 3.
```

---

### Prompt 2 — Backend: Guided prompt template + service function

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- Prompt templates are plain Python string constants in apps/backend/app/prompts/templates.py
- Placeholders use Python str.format() syntax: {placeholder}
- Literal braces in examples MUST be doubled: {{ }}
- The cover letter service is apps/backend/app/services/cover_letter.py
- The existing generate_cover_letter() function must NOT be modified
- complete() is imported from app.llm; it takes prompt, system_prompt, max_tokens
- CoverLetterContext was added to app/schemas/models.py in Prompt 1

## Task 2a: New prompt template
At the END of apps/backend/app/prompts/templates.py, add this constant exactly:

COVER_LETTER_GUIDED_PROMPT = """You are an expert executive resume writer. Write a compelling cover letter.

IMPORTANT: Write in {output_language}.

Job Description:
{job_description}

Candidate Resume (JSON):
{resume_data}

Candidate-Provided Context:
- Company Connection / Why Us: {company_connection}
- Hero Achievement: {hero_achievement}
- Missing Link (skill/gap bridging): {missing_link}
- Career Narrative: {career_narrative}
- Target Role & Company (for RE: line): {job_title} @ {company_name}

{feedback_instructions}

Requirements:
- Length: 300-400 words (body paragraphs only, excluding header block)
- Output the full letter as plain text in this exact structure:

[Candidate full name]
[Candidate email] | [Candidate phone] | [Candidate location]
[Candidate LinkedIn if present]

[Today's date -- formatted as Month Day, Year e.g. October 15, 2026]

[Hiring Manager name if determinable from JD, otherwise "Hiring Manager"]
[Company name]

RE: {job_title} position @ {company_name}

[Paragraph 1 -- The Hook: state the position, lead with the company-connection detail the candidate provided, give a sharp value proposition -- 2-3 sentences]

[Paragraph 2 -- The Impact: 1-2 accomplishments from the candidate's hero achievement that directly match JD requirements; use story + metrics -- 3-4 sentences]

[Paragraph 3 -- The Strategic Fit: soft skills, culture/mission alignment, why this is the natural next step given the career narrative -- 2-3 sentences]

[Paragraph 4 -- Call to Action: professional closing, invite interview, one sentence]

Sincerely,

[Candidate full name]

Rules:
- Use ONLY information from the resume JSON and the context provided above
- Do NOT invent metrics, employers, skills, or achievements not in the resume
- Do NOT use em dash anywhere in the output
- Do NOT open with "I am writing to express..."
- Tone: confident professional, not eager applicant
- Output plain text only -- no markdown, no JSON
"""

The {feedback_instructions} placeholder will be empty on first generation and contain
the user's accumulated feedback on subsequent regenerations.

## Task 2b: Service function
In apps/backend/app/services/cover_letter.py, add this function BELOW the existing ones:

    async def generate_cover_letter_guided(
        resume_data: dict[str, Any],
        job_description: str,
        context: dict[str, Any],
        feedback: str = "",
        language: str = "en",
    ) -> str:
        """Generate a 300-400 word cover letter using candidate-provided context.

        Args:
            resume_data: Structured resume data (ResumeData format)
            job_description: Target job description text
            context: CoverLetterContext dict with answers to the 6 questions
            feedback: Accumulated free-text improvement instructions (empty on first call)
            language: Output language code
        """
        from app.prompts.templates import COVER_LETTER_GUIDED_PROMPT

        validate_source_size(job_description, MAX_JOB_CHARACTERS)
        output_language = get_language_name(language)

        feedback_instructions = (
            f"User Feedback / Improvement Instructions:\n{feedback.strip()}"
            if feedback.strip()
            else ""
        )

        prompt = COVER_LETTER_GUIDED_PROMPT.format(
            job_description=job_description,
            resume_data=json.dumps(resume_data),
            output_language=output_language,
            company_connection=context.get("company_connection", ""),
            hero_achievement=context.get("hero_achievement", ""),
            missing_link=context.get("missing_link", ""),
            career_narrative=context.get("career_narrative", ""),
            font_style=context.get("font_style", "Georgia"),
            font_size=context.get("font_size", "11pt"),
            job_title=context.get("job_title", ""),
            company_name=context.get("company_name", ""),
            feedback_instructions=feedback_instructions,
        )

        result = await complete(
            prompt=prompt,
            system_prompt="You are an expert executive resume writer. Write compelling, personalised cover letters.",
            max_tokens=2048,
        )

        return result.strip()

Note: the local import of COVER_LETTER_GUIDED_PROMPT inside the function body is
intentional (avoids a circular-import risk at module load time). Keep it there.

## What NOT to do
- Do not modify COVER_LETTER_PROMPT or generate_cover_letter()
- Do not touch any router or test file
```

---

### Prompt 3 — Backend: New endpoint + schema exports + tests

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- All routers mount under /api/v1; resumes.py router is at apps/backend/app/routers/resumes.py
- CoverLetterContext and CoverLetterGenerateRequest were added to app/schemas/models.py (Prompt 1)
- generate_cover_letter_guided() was added to app/services/cover_letter.py (Prompt 2)
- Study the existing generate_cover_letter_endpoint at line ~2536 of routers/resumes.py --
  the new endpoint follows the same pattern: tailored-resume check, fetch improvement record,
  fetch job, get language, call service, save to DB.
- db.update_resume(resume_id, {…}) persists arbitrary fields
- GenerateContentResponse is already imported and used for the old endpoint

## Task 3a: Schema exports
In apps/backend/app/schemas/__init__.py, add CoverLetterContext and CoverLetterGenerateRequest
to the imports from app.schemas.models and to __all__ (if one exists). Match the style of
the existing exports.

## Task 3b: New endpoint
In apps/backend/app/routers/resumes.py:

1. Add to the existing import block (do not duplicate imports):
   - CoverLetterContext, CoverLetterGenerateRequest from app.schemas
   - generate_cover_letter_guided from app.services.cover_letter

2. Add this endpoint AFTER the existing generate_cover_letter_endpoint function (after line ~2607):

    @router.post(
        "/{resume_id}/cover-letter/generate", response_model=GenerateContentResponse
    )
    async def generate_cover_letter_guided_endpoint(
        resume_id: str,
        request: CoverLetterGenerateRequest | None = None,
    ) -> GenerateContentResponse:
        """Generate a guided 300-400 word cover letter with candidate-provided context.

        On first call, context is required. On subsequent calls, stored context is
        reused when context is omitted; the feedback field refines the output.
        """
        resume = await db.get_resume(resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        if not resume.get("parent_id"):
            raise HTTPException(
                status_code=400,
                detail="Cover letter can only be generated for tailored resumes.",
            )

        improvement = await db.get_improvement_by_tailored_resume(resume_id)
        if not improvement:
            raise HTTPException(
                status_code=400,
                detail="No job context found for this resume.",
            )

        job = await db.get_job(improvement["job_id"])
        if not job:
            raise HTTPException(status_code=404, detail="Associated job not found.")

        resume_data = resume.get("processed_data")
        if not resume_data:
            raise HTTPException(
                status_code=400,
                detail="Resume has no processed data.",
            )

        _validate_ai_sources(resume, job)
        language = get_content_language()

        # Resolve context: prefer body, fall back to stored, raise if still missing
        if request and request.context is not None:
            context_dict = request.context.model_dump()
            await db.update_resume(resume_id, {"cover_letter_context": context_dict})
        else:
            context_dict = resume.get("cover_letter_context") or {}

        if not context_dict:
            raise HTTPException(
                status_code=400,
                detail="Context required. Provide context answers on first generation.",
            )

        feedback = (request.feedback if request else "") or ""

        try:
            content = await generate_cover_letter_guided(
                resume_data,
                job["content"],
                context_dict,
                feedback=feedback,
                language=language,
            )
        except (DatabaseBusyError, AIOperationDeadlineExceeded, PromptSizeError):
            raise
        except Exception as e:
            logger.error(f"Guided cover letter generation failed: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to generate cover letter. Please try again.",
            )

        await db.update_resume(resume_id, {"cover_letter": content})

        return GenerateContentResponse(
            content=content,
            message="Cover letter generated successfully",
        )

## Task 3c: Unit tests
Create apps/backend/tests/unit/test_cover_letter_guided.py.
Follow the monkeypatching patterns from tests/integration/test_ai_result_contracts.py.

Write 4 tests for generate_cover_letter_guided():

1. test_formats_prompt_with_full_context
   - Monkeypatch complete (in app.services.cover_letter) to capture the prompt arg
   - Call generate_cover_letter_guided with full context including job_title and hero_achievement
   - Assert the captured prompt contains the job_title value and hero_achievement value
   - Assert "User Feedback" is NOT in the prompt (no feedback on first call)

2. test_includes_feedback_when_provided
   - Same monkeypatch
   - Call with feedback="Make paragraph 2 more technical"
   - Assert "User Feedback" and "Make paragraph 2 more technical" appear in the prompt

3. test_returns_stripped_result
   - Monkeypatch complete to return "  cover letter text  "
   - Assert result == "cover letter text"

4. test_raises_on_oversized_job_description
   - Call with job_description="x" * 200_001 (over MAX_JOB_CHARACTERS)
   - Assert PromptSizeError is raised

## Task 3d: Integration tests
Create apps/backend/tests/integration/test_cover_letter_guided_api.py.
Use the isolated_db fixture and AsyncClient(transport=ASGITransport(app=app)) pattern
from conftest.py. Monkeypatch generate_cover_letter_guided inside app.routers.resumes
to avoid real LLM calls.

Set up a helper that creates a tailored resume with a job and improvement record
(study test_pipeline_e2e.py for the full pattern or use db.create_resume / db.create_job /
db.create_improvement directly).

Write 3 tests:

1. test_requires_context_on_first_call
   - POST to /{resume_id}/cover-letter/generate with no body and no stored context
   - Assert 400 response

2. test_saves_context_and_returns_content
   - POST with a valid CoverLetterGenerateRequest body
   - Assert 200, response JSON has "content" == the monkeypatched return value
   - Assert db.get_resume(resume_id)["cover_letter_context"] is not None

3. test_reuses_stored_context_on_second_call
   - Save context via a first POST
   - POST again with no body (no context)
   - Assert 200 (context is reused from DB)

## What NOT to do
- Do not remove or modify any existing endpoint
- Do not touch prompt files or service files
```

---

### Prompt 4 — Frontend: API client + i18n keys

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- All backend calls go through apps/frontend/lib/api/resume.ts
- apiPost is already imported from lib/api/client
- New backend endpoint: POST /resumes/{id}/cover-letter/generate
  - Body: { context?: CoverLetterContext, feedback?: string }
  - Response: { content: string, message: string }
- i18n: any key added to en.json MUST be added to all 7 locale files with identical structure.
  Files: apps/frontend/messages/{en,es,fr,ja,ko,pt-BR,zh}.json
  Build WILL FAIL if locale parity is broken.

## Task 4a: TypeScript types + API function in lib/api/resume.ts

Add these two interfaces near the top of the file, after the existing interfaces:

    export interface CoverLetterContext {
      company_connection: string;
      hero_achievement: string;
      missing_link: string;
      career_narrative: string;
      font_style: string;
      font_size: string;
      job_title: string;
      company_name: string;
    }

    export interface CoverLetterGenerateRequest {
      context?: CoverLetterContext;
      feedback?: string;
    }

Extend the existing ResumeFetchData interface to add:
    cover_letter_context?: CoverLetterContext | null;

Add this function at the end of the file, near the existing generateCoverLetter:

    /** Generates a guided 300-400 word cover letter with context and optional feedback */
    export async function generateCoverLetterGuided(
      resumeId: string,
      request: CoverLetterGenerateRequest,
    ): Promise<string> {
      const res = await apiPost(
        `/resumes/${encodeURIComponent(resumeId)}/cover-letter/generate`,
        request,
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Failed to generate cover letter (status ${res.status}): ${text}`);
      }
      const data = await res.json();
      return data.content as string;
    }

## Task 4b: i18n keys
Add a "wizard" sub-tree to the existing "coverLetter" object in en.json:

    "wizard": {
      "title": "Personalise Your Cover Letter",
      "subtitle": "Answer these questions to generate a tailored 300-400 word cover letter.",
      "questions": {
        "companyConnection": {
          "label": "Company Connection",
          "question": "Why this company? Is there a specific project, product, value, or recent news that made you apply?",
          "placeholder": "e.g. I've been following your work on X since..."
        },
        "heroAchievement": {
          "label": "Hero Achievement",
          "question": "Which 1-2 achievements on your resume best fit this role? What was the story behind them?",
          "placeholder": "e.g. Led the migration of..."
        },
        "missingLink": {
          "label": "Bridging the Gap",
          "question": "Is there a skill or tool in the job description not prominent on your resume but that you have?",
          "placeholder": "e.g. I've used X in side projects but it's not on my resume..."
        },
        "careerNarrative": {
          "label": "Career Narrative",
          "question": "Is there any context for this move -- career change, step up, industry shift? What's your motivation?",
          "placeholder": "e.g. After 3 years in X I'm moving toward Y because..."
        },
        "formatting": {
          "label": "Formatting",
          "fontLabel": "Font",
          "fontSizeLabel": "Font Size",
          "fonts": ["Georgia", "Arial", "Calibri", "Times New Roman", "Garamond"],
          "fontSizes": ["10.5pt", "11pt", "11.5pt", "12pt"]
        },
        "referenceLine": {
          "label": "Reference Line",
          "jobTitleLabel": "Exact Job Title",
          "jobTitlePlaceholder": "e.g. Senior Software Engineer",
          "companyNameLabel": "Company Name",
          "companyNamePlaceholder": "e.g. Stripe"
        }
      },
      "actions": {
        "generate": "Generate Cover Letter",
        "generating": "Generating...",
        "regenerate": "Regenerate",
        "regenerating": "Regenerating...",
        "editAnswers": "Edit Answers"
      },
      "feedback": {
        "title": "Suggestions for Improvement",
        "placeholder": "e.g. Make paragraph 2 more technical, change font to Garamond 11pt",
        "submit": "Regenerate with Feedback",
        "submitting": "Regenerating..."
      },
      "errors": {
        "generateFailed": "Failed to generate cover letter: {error}"
      }
    }

Mirror this EXACT structure (same keys, translated values) in all 6 other locale files.
Use reasonable translations. The fonts and fontSizes arrays are NOT translated -- keep
the same English strings in all 7 files.

Run npm run build (mentally) -- every locale JSON must structurally match en.json.
```

---

### Prompt 5 — Frontend: `CoverLetterWizard` component

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- Swiss International Style is mandatory: rounded-none, 1px ink borders, semantic tokens
- Phosphor icons: import from @phosphor-icons/react
- Primitives: Button, Label, Textarea from components/ui/; PanelHeader for section headers
- i18n: useTranslations() from lib/i18n; wizard keys are under coverLetter.wizard.*
- CoverLetterContext type is exported from lib/api/resume.ts
- Components live in apps/frontend/components/builder/
- All textareas need: onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
- All labels: font-mono text-xs uppercase tracking-wider text-ink

## Task: Create apps/frontend/components/builder/cover-letter-wizard.tsx

The component is 'use client'.

Props interface:
    interface CoverLetterWizardProps {
      initialContext?: Partial<CoverLetterContext>;
      onGenerate: (context: CoverLetterContext) => void;
      isGenerating: boolean;
      className?: string;
    }

Internal state: a CoverLetterContext object, initialised from initialContext
(or with empty strings / defaults: font_style="Georgia", font_size="11pt").

Render a single form with 6 labelled sections stacked vertically:

1. Company Connection -- Textarea for company_connection
   Label: t('coverLetter.wizard.questions.companyConnection.label')
   Subtitle/question text: t('...question') rendered as a small steel-coloured paragraph
   Placeholder: t('...placeholder')

2. Hero Achievement -- Textarea for hero_achievement (same label/question/placeholder pattern)

3. Bridging the Gap -- Textarea for missing_link

4. Career Narrative -- Textarea for career_narrative

5. Formatting -- two <select> elements (native HTML select, styled with Tailwind):
   - Font: select with options from t('coverLetter.wizard.questions.formatting.fonts')
   - Font Size: select with options from t('...fontSizes')
   Style each select as: border border-ink rounded-none bg-white px-2 py-1 font-mono text-sm

6. Reference Line -- two <input type="text"> fields styled like inputs in this codebase:
   - Job Title: input for job_title
   - Company Name: input for company_name
   Use: border border-ink rounded-none bg-white px-3 py-2 text-sm w-full

At the bottom of the form, a full-width "Generate Cover Letter" Button:
- disabled when isGenerating
- Shows SpinnerGap + t('coverLetter.wizard.actions.generating') when isGenerating
- Shows t('coverLetter.wizard.actions.generate') otherwise
- onClick: calls onGenerate(currentState) -- no async in the component

Above the form, a PanelHeader with tone="input":
- title: t('coverLetter.wizard.title')
- Below the title (as children or subtitle): a paragraph with t('coverLetter.wizard.subtitle')
  styled as font-mono text-xs text-steel

No internal API calls. The parent wires onGenerate to the actual API call.
```

---

### Prompt 6 — Frontend: Wire wizard and feedback into `CoverLetterEditor`

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- CoverLetterEditor is at apps/frontend/components/builder/cover-letter-editor.tsx
- CoverLetterWizard was created in Prompt 5 (./cover-letter-wizard)
- generateCoverLetterGuided is in lib/api/resume.ts
- CoverLetterContext type is in lib/api/resume.ts
- i18n keys for the feedback panel are under coverLetter.wizard.feedback.*
- The resumeId and parent context are available in the builder (resume-builder.tsx)

## Task A: Extend CoverLetterEditor

Add three new props to CoverLetterEditorProps:
    resumeId: string;
    initialContext: CoverLetterContext | null;
    isTailored: boolean;     // true when resume has a parent_id

Add internal state:
    type WizardState = 'idle' | 'wizard' | 'generating' | 'done';
    - wizardState: WizardState
    - currentContext: CoverLetterContext | null
    - feedbackText: string
    - isGenerating: boolean
    - generateError: string | null

Initial wizardState logic (computed once on mount via useState initialiser):
- If content is non-empty AND initialContext is non-null: 'done'
- Otherwise: 'idle'

### Rendering by state:

'idle': Show an empty-state section with the generate button.
- If isTailored is false: render an Alert (info variant) explaining the user must
  tailor the resume first. Do not show a generate button.
- If isTailored is true: show a Button calling setState('wizard')
  labelled t('coverLetter.wizard.actions.generate')

'wizard': Render <CoverLetterWizard> with:
    initialContext={currentContext ?? initialContext ?? undefined}
    onGenerate={handleGenerate}
    isGenerating={isGenerating}

'generating': Render a centred div with SpinnerGap (animate-spin) and
t('coverLetter.wizard.actions.generating')

'done': Render the existing textarea and save/signature sections (as they are today),
PLUS a feedback panel below the textarea area:

    <div className="border-t border-panel">
      <PanelHeader tone="input" title={t('coverLetter.wizard.feedback.title')}>
        <Button size="sm" variant="ghost" onClick={() => setWizardState('wizard')}>
          {t('coverLetter.wizard.actions.editAnswers')}
        </Button>
      </PanelHeader>
      <div className="p-4 space-y-3">
        <Textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          placeholder={t('coverLetter.wizard.feedback.placeholder')}
          className="min-h-[80px] resize-none"
        />
        <Button
          onClick={handleFeedback}
          disabled={isGenerating || !feedbackText.trim()}
          size="sm"
        >
          {isGenerating
            ? t('coverLetter.wizard.feedback.submitting')
            : t('coverLetter.wizard.feedback.submit')}
        </Button>
        {generateError && (
          <p className="font-mono text-xs text-destructive">{generateError}</p>
        )}
      </div>
    </div>

### handleGenerate function:
    async function handleGenerate(context: CoverLetterContext) {
      setIsGenerating(true);
      setGenerateError(null);
      setWizardState('generating');
      try {
        const result = await generateCoverLetterGuided(resumeId, { context });
        onChange(result);        // propagate to parent (existing pattern)
        setCurrentContext(context);
        setWizardState('done');
      } catch (err) {
        setGenerateError(
          t('coverLetter.wizard.errors.generateFailed', {
            error: err instanceof Error ? err.message : String(err),
          })
        );
        setWizardState('wizard');  // back to wizard so user can retry
      } finally {
        setIsGenerating(false);
      }
    }

### handleFeedback function:
    async function handleFeedback() {
      if (!feedbackText.trim()) return;
      setIsGenerating(true);
      setGenerateError(null);
      try {
        const result = await generateCoverLetterGuided(resumeId, {
          context: currentContext ?? undefined,
          feedback: feedbackText,
        });
        onChange(result);
        setFeedbackText('');
      } catch (err) {
        setGenerateError(
          t('coverLetter.wizard.errors.generateFailed', {
            error: err instanceof Error ? err.message : String(err),
          })
        );
      } finally {
        setIsGenerating(false);
      }
    }

## Task B: Update the call site in resume-builder.tsx

Find where <CoverLetterEditor> is rendered in apps/frontend/components/builder/resume-builder.tsx.
Add the three new props:
    resumeId={resumeData?.resume_id ?? ''}
    initialContext={resumeData?.cover_letter_context ?? null}
    isTailored={!!resumeData?.parent_id}

(Check the exact shape of resumeData in resume-builder.tsx to confirm the field names.)

## Task C: Tests
Create apps/frontend/tests/cover-letter-editor-wizard.test.tsx with 5 tests.
Follow the vitest + Testing Library patterns from tests/diff-preview-modal.test.tsx.
Stub generateCoverLetterGuided via vi.mock.

1. test_renders_idle_state_when_content_is_empty
   - Render with content="" isTailored=true initialContext=null
   - Assert "Generate Cover Letter" button is visible

2. test_shows_tailor_first_alert_when_not_tailored
   - Render with content="" isTailored=false
   - Assert the alert is present, no generate button

3. test_transitions_to_wizard_on_button_click
   - Click "Generate Cover Letter"
   - Assert wizard questions are visible

4. test_transitions_to_done_after_generation
   - Stub generateCoverLetterGuided to resolve "Cover letter text"
   - Fire onGenerate from the wizard
   - Assert the textarea is visible and the feedback panel title is visible

5. test_calls_regenerate_with_feedback
   - In done state (initialContext non-null, content non-empty)
   - Type feedback text; click "Regenerate with Feedback"
   - Assert generateCoverLetterGuided was called with { context: ..., feedback: "..." }
```

---

### Prompt 7 — Frontend: Update print page for font/size params

```
You are adding a guided cover letter feature to Resume Matcher.

## Context
- The print page for cover letters is apps/frontend/app/print/cover-letter/[id]/page.tsx
- It is a Next.js 16 server component -- do NOT add 'use client'
- searchParams already exists on the PageProps type
- Font style and size prefs are stored in cover_letter_context on the resume record
- The download URL is built by getCoverLetterPdfUrl() in lib/api/resume.ts

## Task A: Update the print page

In apps/frontend/app/print/cover-letter/[id]/page.tsx:

1. Extend the searchParams type to include:
       font?: string;
       fontSize?: string;

2. Add whitelist-based parsing functions near the top of the file
   (prevents CSS injection via URL params):

    const SAFE_FONTS = ['Georgia', 'Arial', 'Calibri', 'Times New Roman', 'Garamond'] as const;
    type SafeFont = (typeof SAFE_FONTS)[number];

    const SAFE_FONT_SIZES = ['10.5pt', '11pt', '11.5pt', '12pt'] as const;
    type SafeFontSize = (typeof SAFE_FONT_SIZES)[number];

    function parseSafeFont(value: string | undefined): SafeFont {
      return (SAFE_FONTS as readonly string[]).includes(value ?? '')
        ? (value as SafeFont)
        : 'Georgia';
    }

    function parseSafeFontSize(value: string | undefined): SafeFontSize {
      return (SAFE_FONT_SIZES as readonly string[]).includes(value ?? '')
        ? (value as SafeFontSize)
        : '11pt';
    }

3. Parse the values from resolvedSearchParams:
       const resolvedFont = parseSafeFont(resolvedSearchParams?.font);
       const resolvedFontSize = parseSafeFontSize(resolvedSearchParams?.fontSize);

4. Apply to the rendered output:
   - In the outer container div: replace fontFamily: 'Georgia, serif' with
     fontFamily: `${resolvedFont}, serif`
   - On each paragraph element: replace any hardcoded fontSize with fontSize: resolvedFontSize

## Task B: Update getCoverLetterPdfUrl in lib/api/resume.ts

Update the function signature to accept an optional context parameter:

    export function getCoverLetterPdfUrl(
      resumeId: string,
      pageSize?: string,
      locale?: string,
      context?: { font_style?: string; font_size?: string } | null,
    ): string {
      // ... existing logic ...
      // After building the base params, add font params if present:
      if (context?.font_style) params.set('font', context.font_style);
      if (context?.font_size) params.set('fontSize', context.font_size);
      return url;
    }

Find all callers of getCoverLetterPdfUrl in the frontend codebase
(grep for getCoverLetterPdfUrl) and pass the cover letter context where it is available
in the calling component's state or props.

No new tests are needed for this prompt.
```

---

## Execution Order

```
Prompt 1 (DB + schemas)
    ↓
Prompt 2 (Prompt + service)
    ↓
Prompt 3 (Endpoint + tests)   ← run: uv run pytest
    ↓
Prompt 4 (API client + i18n)
    ↓
Prompt 5 (Wizard component)
    ↓
Prompt 6 (Wire wizard into editor + tests)   ← run: npm run test
    ↓
Prompt 7 (Print page font params)   ← run: npm run build
```

---

## Definition of Done

- [ ] `cd apps/backend && uv run pytest` — all tests pass (new + existing)
- [ ] `cd apps/frontend && npm run test` — all tests pass (new + existing)
- [ ] `cd apps/frontend && npm run lint` — no lint errors
- [ ] `cd apps/frontend && npm run build` — no type errors, i18n parity intact
- [ ] Wizard renders; questions submit; cover letter generates in the browser
- [ ] Feedback loop produces a new letter without resetting context
- [ ] PDF download respects font/size prefs from the wizard
- [ ] Old "Generate Cover Letter" button on simple tailored resumes still works
