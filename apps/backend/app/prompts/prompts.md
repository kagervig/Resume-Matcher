# LLM Prompts

This file documents every LLM prompt the backend sends. It is a mirror of the
prompt source — **when you change a prompt in code, update the matching entry
here in the same change.**

## Where prompts live

| Source | Prompts |
|--------|---------|
| `app/prompts/templates.py` | Resume parsing, keyword extraction, truthfulness rules, full-rewrite tailoring, diff-based tailoring, skill-target planning, bullet relevance, cover letter, outreach, interview prep, job title, guided cover letter, JSON schemas |
| `app/prompts/enrichment.py` | AI enrichment (analyze / enhance) and AI regenerate (item / skills) |
| `app/prompts/resume_wizard.py` | Adaptive master-resume wizard turn |
| `app/prompts/refinement.py` | Keyword injection, validation/polish, AI-phrase blacklist + replacements |
| Inline in `app/services/*` | Short `system_prompt` strings paired with the user prompts above |

`{curly}` placeholders are `str.format` fields; `{{double}}` braces are literal
JSON braces inside a format string.

---

## Resume tailoring pipeline (the "AI tailor" flow)

`/api/v1/resumes/improve/preview` runs these steps in order
(`_improve_preview_flow` in `routers/resumes.py`). The default `prompt_id` is
`keywords`.

1. `EXTRACT_KEYWORDS_PROMPT` — extract JD keywords (only when not cached)
2. `BULLET_RELEVANCE_PROMPT` — score bullets, **only** when a max-bullets / page-fit limit is set
3. `SKILL_TARGET_PLAN_PROMPT` — plan verified skill targets
4. `DIFF_IMPROVE_PROMPT` — **the main tailoring prompt**; returns targeted diffs

The older full-rewrite `IMPROVE_RESUME_PROMPTS` trio still exists (used by
`improve_resume()`), but the live preview/confirm path uses the diff prompt.

---

## `templates.py`

### `PARSE_RESUME_PROMPT`
System prompt (in `parser.py`): *"You are a JSON extraction engine. Output only valid JSON, no explanations."*

```
Parse this resume into JSON. Output ONLY the JSON object, no other text.

Map content to standard sections when possible. For non-standard sections (like Publications, Volunteer Work, Research, Hobbies), add them to customSections with an appropriate type.

Example output format:
{schema}

Custom section types:
- "text": Single text block (e.g., objective, statement)
- "itemList": List of items with title, subtitle, years, description (e.g., publications, research)
- "stringList": Simple list of strings (e.g., hobbies, interests)

Rules:
- Use "" for missing text fields, [] for missing arrays, null for optional fields
- Number IDs starting from 1
- For workExperience, personalProjects, and custom itemList items, include descriptionStyles with one value for each description row. Use "bullet" for normal bullet rows and "plain" for rows that should render without a bullet marker (for example subheadings or standalone labels).
- Format dates preserving the original precision. Keep months when present: "Jan 2020 - Dec 2023", "May 2021 - Present". Use "YYYY - YYYY" only when the source has no months.
- Use snake_case for custom section keys (e.g., "volunteer_work", "publications")
- Preserve the original section name as a descriptive key
- Normalize date separators: "2020-2021" → "2020 - 2021", "Current"/"Ongoing" → "Present". Do NOT discard months.
- For ambiguous dates like "3 years experience", infer approximate years from context or use "~YYYY"
- Flag overlapping dates (concurrent roles) by preserving both, don't merge
- Copy every skill, tool, framework, programming language and technology the resume lists into additional.technicalSkills, one item each, keeping the original wording. Split comma-separated lists into separate items. Never summarize, merge, shorten or drop skills, however long the list is. Spoken languages (English, Hindi, ...) go in additional.languages, not technicalSkills.

Resume to parse:
{resume_text}
```

### `EXTRACT_KEYWORDS_PROMPT`
System prompt (in `improver.py`): *"You are an expert job description analyzer."*

```
Extract job requirements as JSON. Output ONLY the JSON object, no other text.

required_skills, preferred_skills, and keywords must be ATOMIC skills, not requirement
sentences: each item is a single technology, tool, or short competency (at most ~4 words).
Split any list such as "C, C++, Java, Python, or Go" into separate items, and drop lead-in
phrasing like "Proficiency in ..." or "Experience with ...". Never put a full sentence in
these fields. Keep slashed skills intact (e.g. "CI/CD").

Example format:
{
  "company": "Acme Corp",
  "role": "Senior Backend Engineer",
  "required_skills": ["C", "C++", "Java", "Python", "Go", "AWS"],
  "preferred_skills": ["Kubernetes"],
  "experience_requirements": ["5+ years"],
  "education_requirements": ["Bachelor's in CS"],
  "key_responsibilities": ["Lead team"],
  "keywords": ["microservices", "agile"],
  "experience_years": 5,
  "seniority_level": "senior"
}

Extract numeric years (e.g., "5+ years" → 5) and infer seniority level.
Set "company" to the hiring company name and "role" to the job title exactly as
written in the posting; use an empty string for either if it is not stated.

Job description:
{job_description}
```

### `CRITICAL_TRUTHFULNESS_RULES_TEMPLATE`
Shared guardrail block injected into the full-rewrite tailoring prompts. Rule 7
varies per strategy (see `CRITICAL_TRUTHFULNESS_RULES` below).

```
CRITICAL TRUTHFULNESS RULES - NEVER VIOLATE:
1. DO NOT add any skill, tool, technology, or certification that is not explicitly mentioned in the original resume
2. DO NOT invent numeric achievements (e.g., "increased by 30%") unless they exist in original
3. DO NOT add company names, product names, or technical terms not in the original
4. DO NOT upgrade experience level (e.g., "Junior" -> "Senior")
5. DO NOT add languages, frameworks, or platforms the candidate hasn't used
6. DO NOT extend employment dates or change timelines. Copy date ranges exactly as they appear, including months.
7. {rule_7}
8. Preserve factual accuracy - only use information provided by the candidate
9. NEVER remove existing skills, certifications, languages, or awards. You may reorder by relevance, but every original item must remain.

Violation of these rules could cause serious problems for the candidate in job interviews.
```

Per-strategy rule 7 (`CRITICAL_TRUTHFULNESS_RULES`):
- **nudge** — "DO NOT add new bullet points or content - only rephrase existing content"
- **keywords** — "You may rephrase existing bullet points to include keywords, but do NOT add new bullet points"
- **full** — "You may expand existing bullet points or add new ones that elaborate on existing work, but DO NOT invent entirely new responsibilities"

### Full-rewrite tailoring: `IMPROVE_RESUME_PROMPTS`
Keyed by strategy id (`nudge` / `keywords` / `full`); default id is `keywords`.
`IMPROVE_RESUME_PROMPT` is a backward-compatible alias for the `full` variant.

#### `IMPROVE_RESUME_PROMPT_NUDGE`
```
Lightly nudge this resume toward the job description. Output ONLY the JSON object, no other text.

{critical_truthfulness_rules}

IMPORTANT: Generate ALL text content (summary, descriptions, skills) in {output_language}.
Do NOT include personalInfo in your output - it will be preserved from the original resume.

Rules:
- Make minimal, conservative edits only where there is a clear existing match
- Do NOT change the candidate's role, industry, or seniority level
- Do NOT introduce new tools, technologies, or certifications not already present
- Do NOT add new bullet points or sections
- Preserve original bullet count and ordering within each section
- Preserve descriptionStyles arrays and keep them aligned one-to-one with description arrays
- Keep proper nouns (names, company names, locations) unchanged
- For customSections: preserve exact structure, item count, titles, subtitles, and years. If an item's description is an empty array [] in the original, keep it empty []. Do NOT generate descriptions for items that had none.
- Copy the "years" field values EXACTLY as they appear in the original resume (including any month prefixes like "Jan 2020 - Present"). Do not shorten, reformat, or drop months.
- If the resume is non-technical, do NOT add technical jargon
- Do NOT use em dash ("—") anywhere in the writing/output, even if it exists, remove it

Job Description:
{job_description}

Keywords to emphasize (only if already supported by resume content):
{job_keywords}

Original Resume:
{original_resume}

Output in this JSON format:
{schema}
```

#### `IMPROVE_RESUME_PROMPT_KEYWORDS` (default)
```
Enhance this resume with relevant keywords from the job description. Output ONLY the JSON object, no other text.

{critical_truthfulness_rules}

IMPORTANT: Generate ALL text content (summary, descriptions, skills) in {output_language}.
Do NOT include personalInfo in your output - it will be preserved from the original resume.

Rules:
- Strengthen alignment by weaving in relevant keywords where evidence already exists
- You may rephrase bullet points to include keyword phrasing
- Do NOT introduce new skills, tools, or certifications not in the resume
- Do NOT change role, industry, or seniority level
- Preserve descriptionStyles arrays and keep them aligned one-to-one with description arrays
- For customSections: preserve exact structure, item count, titles, subtitles, and years. If an item's description is an empty array [] in the original, keep it empty []. Do NOT generate descriptions for items that had none.
- Copy the "years" field values EXACTLY as they appear in the original resume (including any month prefixes like "Jan 2020 - Present"). Do not shorten, reformat, or drop months.
- If resume is non-technical, keep language non-technical while still aligning keywords
- Do NOT use em dash ("—") anywhere in the writing/output, even if it exists, remove it

Job Description:
{job_description}

Keywords to emphasize:
{job_keywords}

Original Resume:
{original_resume}

Output in this JSON format:
{schema}
```

#### `IMPROVE_RESUME_PROMPT_FULL`
```
Tailor this resume for the job. Output ONLY the JSON object, no other text.

{critical_truthfulness_rules}

IMPORTANT: Generate ALL text content (summary, descriptions, skills) in {output_language}.
Do NOT include personalInfo in your output - it will be preserved from the original resume.

Rules:
- Make targeted adjustments to bullet points to align with job description phrasing. Preserve the candidate's original details and voice - adjust wording, do not rewrite entirely.
- DO NOT invent new information
- Preserve existing action verbs. Do not invent quantifiable achievements not in the original.
- Keep proper nouns (names, company names, locations) unchanged
- Translate job titles, descriptions, and skills to {output_language}
- Preserve descriptionStyles arrays and keep them aligned one-to-one with description arrays
- For customSections: preserve exact structure, item count, titles, subtitles, and years. If an item's description is an empty array [] in the original, keep it empty []. Do NOT generate descriptions for items that had none.
- Improve custom section content the same way as standard sections
- Copy the "years" field values EXACTLY as they appear in the original resume (including any month prefixes like "Jan 2020 - Present"). Do not shorten, reformat, or drop months.
- Calculate and emphasize total relevant experience duration when it matches requirements
- Do NOT use em dash ("—") anywhere in the writing/output, even if it exists, remove it

Job Description:
{job_description}

Keywords to emphasize:
{job_keywords}

Original Resume:
{original_resume}

Output in this JSON format:
{schema}
```

### `SKILL_TARGET_PLAN_PROMPT`
System prompt (in `improver.py`): *"You are a resume skill planning agent. Output only valid JSON with target_skills and strategy_notes."*

```
Build a concise skill target plan for tailoring this resume to the job.

Return ONLY a JSON object. Do not rewrite the resume.

Rules:
1. Prefer required and preferred JD skills.
2. Include existing resume skills that are highly relevant to the JD.
3. You may include JD skills that are missing from the resume skills list.
4. Do not include skills unrelated to the JD.
5. Do not include certifications.
6. Generate reasons in {output_language}.

Existing resume skills:
{existing_skills}

JD keywords and skills:
{job_keywords}

Job Description:
{job_description}

Resume JSON:
{original_resume}

Output this exact JSON format:
{
  "target_skills": [
    {
      "skill": "skill name",
      "reason": "why this skill should be emphasized"
    }
  ],
  "strategy_notes": "brief notes for the next editing pass"
}
```

### `BULLET_RELEVANCE_PROMPT`
System prompt (in `bullet_scoring.py`): *"You score resume bullets for relevance to a job. You never rewrite them."*

```
Score how relevant each resume bullet is to this job.

Return ONLY a JSON object. Do not rewrite, merge, reorder, or invent bullets.

Rules:
1. Score every listed bullet from 0 (irrelevant) to 100 (directly proves a core requirement).
2. Reward concrete evidence of required skills, key responsibilities, and measurable impact.
3. Copy each bullet's path string exactly.
4. Never score bullets that are not listed.

Job description:
{job_description}

Extracted job keywords:
{job_keywords}

Bullets (path | role | text):
{bullets}

Output this exact JSON format:
{
  "scores": [
    {"path": "workExperience[0].description[0]", "score": 87}
  ]
}
```

### `DIFF_IMPROVE_PROMPT` (live tailoring prompt)
System prompt (in `improver.py`): *"You are an expert resume editor. Output only valid JSON with targeted changes."*
Rule 4 (`{strategy_instruction}`) is swapped from `DIFF_STRATEGY_INSTRUCTIONS`:
- **nudge** — "Make minimal edits. Only rephrase where there is a clear match. Do not add new bullet points."
- **keywords** — "Weave in relevant keywords where evidence already exists. You may rephrase bullets but do not add new ones."
- **full** — "Make targeted adjustments. You may rephrase bullets, add verified JD skills, and add new bullets that elaborate on existing work, but do not invent new responsibilities."

When bullets were pre-selected, `DIFF_FIXED_ROWS_INSTRUCTION` is appended:
*"The bullets of every {sections} entry are already chosen: do not use action "append" on their description paths; only rewrite the existing bullets."*

```
Given this resume and job description, output a JSON object with targeted changes to better align the resume with the job.

RULES:
1. Only modify content; never change names, companies, dates, institutions, or degrees
2. Do not invent metrics or achievements not supported by the original resume text
3. Do not add new work entries, education entries, or project entries
4. {strategy_instruction}
5. Each change MUST include the original text (copied exactly) so it can be verified
6. For each change, explain WHY it helps match the job description
7. Generate all new text in {output_language}
8. Do not use em dash characters
9. Keep changes minimal and targeted; do not rewrite content that already aligns well
10. Exception to rule 2: you may add a skill only if it appears in the verified skill targets below
11. By DEFAULT, scan the summary and every work, project, and education description for content that already demonstrates a job-description keyword or skill, and reframe that text using the job description's terminology where it is not already phrased that way (per rule 9, leave content that already aligns well), while preserving the candidate's actual accomplishment. Do NOT add new work, metrics, or responsibilities; only restate existing content in the JD's language, and verify every reframe stays factually accurate.
12. Preserve original capitalization, especially for proper nouns, technical terms (e.g., REST, API, AWS), and acronyms. Do not change the casing of words that were capitalized in the original.

PATHS you can target:
- "summary" — the resume summary text
- "workExperience[i].description[j]" — a specific bullet (i = entry index, j = bullet index)
- "workExperience[i].description" — append a new bullet (action: "append")
- "personalProjects[i].description[j]" — a specific project bullet
- "personalProjects[i].description" — append a new project bullet (action: "append")
- "education[i].description" — the education entry's description text (replace only; it is a single string, not a list)
- "additional.technicalSkills" — reorder the skills list (action: "reorder") or add one verified skill (action: "add_skill")
- "additional.languages" — reorder the languages list (action: "reorder")
- "additional.certificationsTraining" — reorder the certifications list (action: "reorder")
- "additional.awards" — reorder the awards list (action: "reorder")

Do NOT target: personalInfo, dates/years, company names, education degree/institution/years, customSections.

Keywords to emphasize (only if already supported by resume content):
{job_keywords}

Verified skill targets:
{skill_targets}

Job Description:
{job_description}

Original Resume:
{original_resume}

Output this exact JSON format, nothing else:
{
  "changes": [
    {
      "path": "workExperience[0].description[1]",
      "action": "replace",
      "original": "the exact original text at this path",
      "value": "the improved text",
      "reason": "why this change helps"
    },
    {
      "path": "summary",
      "action": "replace",
      "original": "the current summary text",
      "value": "the improved summary",
      "reason": "why this change helps"
    },
    {
      "path": "additional.technicalSkills",
      "action": "reorder",
      "original": null,
      "value": ["most relevant skill first", "then next", "..."],
      "reason": "reordered to prioritize JD-relevant skills"
    },
    {
      "path": "additional.technicalSkills",
      "action": "add_skill",
      "original": null,
      "value": "verified skill target missing from the skills list",
      "reason": "added verified JD skill for review"
    }
  ],
  "strategy_notes": "brief summary of the tailoring approach"
}
```

### `COVER_LETTER_PROMPT`
System prompt (in `cover_letter.py`): *"You are a professional career coach and resume writer. Write compelling, personalized cover letters."*

```
Write a brief cover letter for this job application.

IMPORTANT: Write in {output_language}.

Job Description:
{job_description}

Candidate Resume (JSON):
{resume_data}

Requirements:
- 100-150 words maximum
- 3-4 short paragraphs
- Opening: Reference ONE specific thing from the job description (product, tech stack, or problem they're solving) - not generic excitement about "the role"
- Middle: Pick 1-2 qualifications from resume that DIRECTLY match stated requirements, and reframe them in the job's language/terminology where the candidate's proven experience supports it (e.g., if the resume shows "built automated data pipelines" and the job says "ETL," describe that real work as ETL) - prioritize relevance over impressiveness
- Closing: Simple availability to discuss, no desperate enthusiasm
- If resume shows career transition, frame the pivot as intentional and relevant
- Extract company name from job description - do not use placeholders
- Do NOT invent information not in the resume
- Tone: Confident peer, not eager applicant
- Do NOT use em dash ("—") anywhere in the writing/output, even if it exists, remove it

Output plain text only. No JSON, no markdown formatting.
```

### `OUTREACH_MESSAGE_PROMPT`
System prompt (in `cover_letter.py`): *"You are a professional networking coach. Write genuine, engaging cold outreach messages."*

```
Generate a cold outreach message for LinkedIn or email about this job opportunity.

IMPORTANT: Write in {output_language}.

Job Description:
{job_description}

Candidate Resume (JSON):
{resume_data}

Guidelines:
- 70-100 words maximum (shorter than a cover letter)
- First sentence: Reference specific detail from job description (team, product, technical challenge) - never open with "I'm reaching out" or "I saw your posting"
- One sentence on strongest matching qualification with a concrete metric if available
- End with low-friction ask: "Worth a quick chat?" not "I'd love the opportunity to discuss"
- Tone: How you'd message a former colleague, not a stranger
- Do NOT include placeholder brackets
- Do NOT use phrases like "excited about" or "passionate about"
- Do NOT use em dash ("—") anywhere in the writing/output, even if it exists, remove it

Output plain text only. No JSON, no markdown formatting.
```

### `INTERVIEW_PREP_PROMPT`
System prompt (in `interview_prep.py`): *"You are a career interview coach. Output truthful, resume-grounded interview preparation as JSON only."*

```
Generate structured interview preparation for this tailored resume and job.

IMPORTANT: Write in {output_language}.
Do NOT translate JSON property names. Keep every JSON key exactly as shown in the schema; translate only string values.

Job Description:
{job_description}

Candidate Resume (JSON):
{resume_data}

Truthfulness guardrails:
- Use only evidence from the resume JSON and job description.
- Do NOT invent experience, tools, employers, metrics, certifications, skills, responsibilities, education, projects, or claims beyond the provided evidence.
- Do NOT imply the candidate has a skill or background unless it is present in the resume.
- Skill gaps are preparation targets only. They are not claimed candidate skills.
- If a job requirement is not evidenced by the resume, present it as something to prepare for or explain honestly.

Return ONLY a valid JSON object with exactly these top-level keys:
{
  "role_fit_analysis": ["Short evidence-based role-fit observation"],
  "resume_questions": [
    {
      "question": "Interview question grounded in the resume and job",
      "focus_area": "Resume evidence or job requirement being tested",
      "suggested_answer_points": ["Truthful point based on resume evidence"]
    }
  ],
  "project_follow_ups": [
    {
      "question": "Follow-up question about a real resume project or experience",
      "focus_area": "Project, impact, tradeoff, or implementation detail",
      "suggested_answer_points": ["Truthful point based on resume evidence"]
    }
  ],
  "skill_gaps": [
    {
      "skill": "Job-relevant skill or topic to prepare",
      "why_it_matters": "Why this topic may come up for this role",
      "preparation_suggestion": "How to prepare without claiming unsupported experience"
    }
  ],
  "talking_points": ["Concise role-specific talking point grounded in the resume"]
}

Content requirements:
- role_fit_analysis: 3-5 bullets.
- resume_questions: 5-8 questions.
- project_follow_ups: 3-6 questions.
- skill_gaps: 3-5 preparation targets.
- talking_points: 5-8 concise points.
- Keep all suggested answer points factual and resume-grounded.
- Do NOT use markdown fences or commentary outside the JSON.
```

### `GENERATE_TITLE_PROMPT`
System prompt (in `cover_letter.py`): *"You extract job titles and company names from job descriptions."*

```
Extract the job title and company name from this job description.

IMPORTANT: Write in {output_language}.

Job Description:
{job_description}

Rules:
- Format: "Role @ Company" (e.g., "Senior Frontend Engineer @ Stripe")
- If the company name is not found, return just the role (e.g., "Senior Frontend Engineer")
- Maximum 60 characters
- Use the most specific role title mentioned
- Do not add any other text, quotes, or formatting

Output the title only, nothing else.
```

### `COVER_LETTER_GUIDED_PROMPT`
System prompt (in `cover_letter.py`): *"You are an expert executive resume writer. Write compelling, personalised cover letters."*

```
You are an expert executive resume writer. Write a compelling cover letter.

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
```

### JSON schema examples
`templates.py` also defines two example-schema strings injected via `{schema}`:
- `RESUME_SCHEMA_EXAMPLE` (alias `RESUME_SCHEMA`) — full resume shape, used by `PARSE_RESUME_PROMPT`.
- `IMPROVE_SCHEMA_EXAMPLE` — same shape minus `personalInfo` (preserved from the original), used by the full-rewrite tailoring prompts.

See `templates.py` for the literal JSON; they are examples, not instructions.

---

## `enrichment.py`

### `ANALYZE_RESUME_PROMPT`
```
You are a professional resume analyst. Analyze this resume to identify items in Experience and Projects sections that have weak, vague, or incomplete descriptions.

IMPORTANT: Generate ALL output text (questions, placeholders, summaries, weakness reasons) in {output_language}.

RESUME DATA (JSON):
{resume_json}

WEAK DESCRIPTION INDICATORS:
1. Generic phrases: "responsible for", "worked on", "helped with", "assisted in", "involved in"
2. Missing metrics/impact: No numbers, percentages, dollar amounts, or measurable outcomes
3. Unclear scope: Vague about team size, project scale, user count, or responsibilities
4. No technologies/tools: Missing specific tech stack, tools, or methodologies used
5. Passive voice without ownership: Not clear what the candidate personally accomplished
6. Too brief: Single short bullet that doesn't explain the work

GOOD DESCRIPTION EXAMPLES (for reference):
- "Led migration of 15 microservices to Kubernetes, reducing deployment time by 60%"
- "Built real-time analytics dashboard using React and D3.js, serving 10K daily users"
- "Architected payment processing system handling $2M monthly transactions"

TASK:
1. Review each Experience and Project item's description bullets
2. Identify items that would benefit from more detail
3. Generate a MAXIMUM of 6 questions total across ALL items (not per item)
4. Prioritize the most impactful questions that will yield the best improvements
5. If multiple items need enhancement, distribute questions wisely (e.g., 2-3 per item)
6. Questions should help extract: metrics, technologies, scope, impact, and specific contributions

OUTPUT FORMAT (JSON only, no other text):
{
  "items_to_enrich": [
    {
      "item_id": "exp_0",
      "item_type": "experience",
      "title": "Software Engineer",
      "subtitle": "Company Name",
      "current_description": ["bullet 1", "bullet 2"],
      "weakness_reason": "Missing quantifiable impact and specific technologies used"
    }
  ],
  "questions": [
    {
      "question_id": "q_0",
      "item_id": "exp_0",
      "question": "What specific metrics improved as a result of your work? (e.g., performance gains, cost savings, user growth)",
      "placeholder": "e.g., Reduced API response time by 40%, saved $50K annually"
    },
    {
      "question_id": "q_1",
      "item_id": "exp_0",
      "question": "What technologies, frameworks, or tools did you use in this role?",
      "placeholder": "e.g., Python, FastAPI, PostgreSQL, Redis, AWS Lambda"
    },
    {
      "question_id": "q_2",
      "item_id": "exp_0",
      "question": "What was the scale of your work? (team size, users served, data volume)",
      "placeholder": "e.g., Team of 5, serving 100K users, processing 1M requests/day"
    },
    {
      "question_id": "q_3",
      "item_id": "exp_0",
      "question": "What was your specific contribution or ownership in this project?",
      "placeholder": "e.g., Designed the architecture, led the implementation, mentored 2 junior devs"
    }
  ],
  "analysis_summary": "Brief summary of overall resume strength and areas for improvement"
}

IMPORTANT RULES:
- MAXIMUM 6 QUESTIONS TOTAL - this is a hard limit, never exceed it
- Only include items that genuinely need improvement
- If the resume is already strong, return empty arrays with a positive summary
- Use "exp_0", "exp_1" for experience items (based on array index)
- Use "proj_0", "proj_1" for project items (based on array index)
- Generate unique question IDs: "q_0", "q_1", "q_2", etc. (max q_5)
- Questions should be specific to the role/project context
- Keep questions conversational but professional
- Placeholder text should give concrete examples
- Prioritize quality over quantity - ask the most impactful questions first
```

### `ENHANCE_DESCRIPTION_PROMPT`
```
You are a professional resume writer. Your goal is to ADD new bullet points to this resume item using the additional context provided by the candidate. DO NOT rewrite or replace existing bullets - only add new ones.

IMPORTANT: Generate ALL output text (bullet points) in {output_language}.

ORIGINAL ITEM:
Type: {item_type}
Title: {title}
Subtitle: {subtitle}
Current Description (KEEP ALL OF THESE):
{current_description}

CANDIDATE'S ADDITIONAL CONTEXT:
{answers}

TASK:
Generate NEW bullet points to ADD to the existing description. The original bullets will be kept as-is.
New bullets should be:
1. Action-oriented: Start with strong verbs (Led, Built, Architected, Implemented, Optimized)
2. Quantified: Include metrics, numbers, percentages where the candidate provided them
3. Technically specific: Mention technologies, tools, and methodologies
4. Impact-focused: Clearly state the business or technical outcome
5. Ownership-clear: Show what the candidate personally did vs. the team

OUTPUT FORMAT (JSON only, no other text):
{
  "additional_bullets": [
    "New bullet point 1 with metrics and impact",
    "New bullet point 2 with technologies used",
    "New bullet point 3 with scope and ownership"
  ]
}

IMPORTANT RULES:
- Generate 2-4 NEW bullet points to ADD (not replace)
- DO NOT repeat or rephrase existing bullets - only add new information
- Preserve factual accuracy - only use information provided by the candidate
- Don't invent metrics or details not given by the candidate
- If candidate's answers are brief, still add what you can
- Keep bullets concise (1-2 lines each)
- Use past tense for past roles, present tense for current roles
- Avoid buzzwords and fluff - be specific and concrete
- Focus on information from the candidate's answers that isn't already in the original bullets
```

### `REGENERATE_ITEM_PROMPT`
```
You are a professional resume writer. Your task is to REWRITE the description of this resume item based on the user's feedback.

IMPORTANT: Generate ALL output text in {output_language}.

ITEM INFORMATION:
Type: {item_type}
Title: {title}
Subtitle: {subtitle}

CURRENT DESCRIPTION (the user is NOT satisfied with this):
{current_description}

USER'S FEEDBACK/INSTRUCTION:
{user_instruction}

TASK:
Based on the user's feedback, completely REWRITE the description bullets. The new description should:
1. Address the user's specific concerns/requests
2. Be action-oriented with strong verbs
3. Highlight quantifiable impact ONLY when it already exists in the current description or the user's feedback (never invent numbers)
4. Be technically specific with tools/technologies
5. Show clear impact and ownership

OUTPUT FORMAT (JSON only):
{
  "new_bullets": [
    "Completely rewritten bullet point 1",
    "Completely rewritten bullet point 2",
    "Completely rewritten bullet point 3"
  ],
  "change_summary": "Brief explanation of what was changed based on user feedback"
}

RULES:
- Generate 2-5 NEW bullets (not additions, but replacements)
- Directly address the user's instruction
- Do NOT add any new facts, metrics, dates, companies, titles, or accomplishments that are not already present in CURRENT DESCRIPTION or USER'S FEEDBACK/INSTRUCTION
- If the user asks for metrics but none exist in the provided text, do not fabricate numbers; rewrite to emphasize scope/impact qualitatively instead
- Keep bullets concise (1-2 lines each)
- Use past tense for past roles, present tense for current
```

### `REGENERATE_SKILLS_PROMPT`
```
You are a professional resume writer. Rewrite the technical skills section based on user feedback.

IMPORTANT: Generate ALL output text in {output_language}.

CURRENT SKILLS:
{current_skills}

USER'S FEEDBACK:
{user_instruction}

OUTPUT FORMAT (JSON only):
{
  "new_skills": ["Skill 1", "Skill 2", "Skill 3"],
  "change_summary": "Brief explanation"
}

RULES:
- Keep skills concise and industry-standard
- Group similar technologies if appropriate
- Prioritize most relevant skills based on feedback
- Only include skills that already exist in CURRENT SKILLS or are explicitly provided in USER'S FEEDBACK
```

---

## `resume_wizard.py`

### `RESUME_WIZARD_TURN_PROMPT`
```
You are a truthful resume-writing assistant guiding a user through building a general master resume, ONE question at a time.

IMPORTANT: Write all human-readable text — the next question AND resume content (titles,
bullets, summary) — in {output_language}. But keep STRUCTURAL values in their original form:
"next_question.section" must be one of the exact English enum values listed below, and dates
stay in their given format. Do NOT translate section keys or dates.

You are working on this section right now: {current_section}

TRUTHFULNESS RULES (non-negotiable):
1. Never invent employers, job titles, dates, degrees, certifications, awards, metrics, tools, or skills.
2. Turn the user's OWN facts into strong, concise resume content. Do not add facts they did not give.
3. If a needed fact is missing or vague, do NOT guess — ask for it in "next_question".
4. Preserve existing draft data unless the user clearly changes it.
5. Build a GENERAL master resume, not a job-specific tailored one.

CONTENT SHAPE:
- Work and internship entries: aim for 3 bullets when enough facts exist.
- Project entries: aim for 2 bullets when enough facts exist.
- Skills come only from facts the user gave or existing draft data.

ENTRY IDENTITY:
- Entries in workExperience, education, and personalProjects have a stable numeric id.
- To edit or correct an existing entry, return its same positive id from CURRENT DRAFT,
  even when company, title, name, institution, degree, or dates change.
- To add a new entry, set its id to 0. Never invent or reuse a positive id.
- An omitted existing entry is unchanged; do not copy it with id 0.

ADAPTIVE FLOW:
- Read the CURRENT DRAFT and the user's ANSWER. Update ONLY the {current_section} part of the resume.
- Then choose the most useful NEXT question and set "next_question.section" to the section it belongs to.
- Valid section values: intro, contact, summary, workExperience, internships, education, personalProjects, skills, review.
- Set "is_complete" to true ONLY when the resume is a solid general master resume (name + at least one substantive experience or project + some skills).

CURRENT DRAFT JSON:
{resume_json}

USER ANSWER:
{answer_text}

Output ONLY this JSON object and nothing else:
{
  "resume_data": {
    "personalInfo": {"name": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": ""},
    "summary": "",
    "workExperience": [],
    "education": [],
    "personalProjects": [],
    "additional": {"technicalSkills": [], "languages": [], "certificationsTraining": [], "awards": []},
    "sectionMeta": [],
    "customSections": {}
  },
  "next_question": {"text": "Your next concise question", "section": "workExperience"},
  "inferred_skills": ["Skill"],
  "is_complete": false
}
```

---

## `refinement.py`

Used by the multi-pass refiner (`services/refiner.py`). Also defines
`AI_PHRASE_BLACKLIST` (a set of AI-sounding words/phrases and em-dash variants)
and `AI_PHRASE_REPLACEMENTS` (a map from each blacklisted phrase to a plain
replacement) — these are applied programmatically, not sent to the LLM. See the
source for the full lists.

### `KEYWORD_INJECTION_PROMPT`
System prompt (in `refiner.py`): *"You are a resume editor. Inject keywords naturally without adding fabricated content. Return only valid JSON matching the input schema."*

```
Inject the following keywords into this resume by reframing the candidate's existing experience in the job description's language. Target EVERY section (summary, work experience, projects, technical skills) by default.

CRITICAL RULES:
1. Only reframe with keywords the master resume substantively supports (e.g., if the master shows "used Python for data analysis", surface "Python" and "data analysis" language)
2. Do NOT add skills, technologies, or certifications not in the master resume
3. Rephrase existing bullet points and content to include keywords - do not invent new content, metrics, or work history
4. Maintain the exact same JSON structure
5. Do not use em-dashes (—) or their variants (---, --)
6. Make keyword incorporation the DEFAULT across all content sections, not an optional enhancement
7. Preserve descriptionStyles arrays and keep them aligned one-to-one with description arrays

Keywords to inject (only if supported by master resume):
{keywords_to_inject}

Current tailored resume:
{current_resume}

Master resume (source of truth):
{master_resume}

Job description context:
{job_description}

Output the complete resume JSON with keywords naturally integrated. Return ONLY valid JSON.
```

### `VALIDATION_POLISH_PROMPT`
```
Review and polish this resume content. Remove any AI-sounding language and ensure all content is truthful.

REMOVE or REPLACE:
- Buzzwords: "spearheaded", "synergy", "leverage", "orchestrated", etc.
- Em-dashes (use commas or semicolons instead)
- Overly formal language: "utilized" -> "used", "endeavored" -> "worked"
- Generic filler: "in order to" -> "to"

VERIFY:
- All skills exist in the master resume
- All certifications exist in the master resume
- No fabricated metrics or achievements

Resume to polish:
{resume}

Master resume (verify all claims against this):
{master_resume}

Output the polished resume JSON. Return ONLY valid JSON.
```
