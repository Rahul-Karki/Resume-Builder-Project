"""ATS scoring + improvement prompt templates.

Notes:
- These templates are designed to be safe with Python `.format(...)`.
- Only the placeholders documented in each prompt should remain unescaped.
- Avoid introducing new `{placeholders}` unless you also update the call sites.
"""

# ============================================================
# ATS RESUME SCORING PROMPT — Advanced (Actionable + JSON)
# Features:
#   1) Section audit (missing / empty / weak)
#   2) Keyword gap analysis (JD + resume-informed inference)
#   3) Concrete “how to increase score” plan with estimated gains
#   4) Copy-paste snippets (summary, skills, bullets)
# Output: STRICT JSON ONLY
# ============================================================

ATS_SYSTEM_PROMPT = """
You are an expert ATS (Applicant Tracking System) Resume Analyzer & Optimizer.
You know how resumes are parsed, how keyword matching works, and what structure improves ATS outcomes.

You must be:
- Actionable: every issue must include a fix the user can copy-paste.
- Honest: never invent experience; only suggest keywords if they plausibly fit.
- ATS-practical: prioritize standard headings, clean bullets, and measurable impact.
""".strip()

# -------------------------------------------------------------------
# MAIN SCORING PROMPT
# -------------------------------------------------------------------
ATS_SCORING_PROMPT = """
TASK: Analyze the resume for ATS and produce a score + a concrete improvement plan.

INPUTS
- RESUME_TEXT: {resume_text}
- JOB_DESCRIPTION: {job_description}

OUTPUT REQUIREMENTS (STRICT)
1) Output MUST be valid JSON only (no markdown, no extra text).
2) The JSON MUST match the schema below.
3) Language: use the same language as the resume; if unclear, use Hinglish (Hindi + English keywords).

SCORING GUIDELINES
- Overall ATS score is 0-100.
- If JOB_DESCRIPTION is empty/short, score as a general resume ATS score and infer a likely target role from the resume.
- A section that exists but is empty (only heading, placeholders, or 1-2 generic lines) counts as "empty" and should be treated like missing.
- Weak writing indicators: generic statements, no impact/metrics, no role keywords, vague verbs ("worked on", "helped"), unclear dates.

KEYWORD SUGGESTION RULES (IMPORTANT)
- Provide 3 keyword buckets:
  - must_add: exact terms from JD that are missing
  - likely_add: inferred from the resume content (adjacent ecosystem/tools) but label "Only add if true"
  - optional_if_true: industry-standard terms that are plausible but require user confirmation
- Never invent tools, employers, degrees, or years. If uncertain, ask a question.
- Give section-level placement advice: where to add each keyword (Summary vs Skills vs Experience vs Projects).

JSON SCHEMA (return exactly these keys)
{{
  "overall_score": 0,
  "grade": "poor|average|good|excellent",
  "score_breakdown": {{
    "keyword_match": 0,
    "formatting": 0,
    "section_completeness": 0,
    "experience_quality": 0,
    "skills_quality": 0,
    "summary_quality": 0
  }},
  "section_audit": [
    {{
      "section": "contact_info|summary|experience|education|skills|certifications|projects|achievements|languages|volunteer",
      "status": "present|missing|empty|weak",
      "why_it_hurts_ats": "",
      "what_to_add_or_fix": "",
      "copy_paste_template": "",
      "example_improved": "",
      "keywords_to_include": [""],
      "expected_score_gain": 0
    }}
  ],
  "keyword_analysis": {{
    "jd_keywords": {{
      "hard_skills": [""],
      "tools_technologies": [""],
      "soft_skills": [""],
      "industry_terms": [""],
      "certifications": [""],
      "action_verbs": [""]
    }},
    "matched_keywords": [""],
    "missing_keywords": [""],
    "keyword_buckets": {{
      "must_add": [""],
      "likely_add_only_if_true": [""],
      "optional_if_true": [""]
    }},
    "keyword_placement": [
      {{ "keyword": "", "place_in": ["summary", "skills", "experience", "projects"], "how_to_use": "" }}
    ]
  }},
  "quick_wins": [""],
  "estimated_score_after_fixes": 0,
  "questions_for_user": ["" ]
}}
""".strip()

# -------------------------------------------------------------------
# QUICK RE-SCORE PROMPT (after user makes changes)
# -------------------------------------------------------------------
ATS_RESCORE_PROMPT = """
The user has updated their resume based on previous suggestions.

PREVIOUS SCORE: {previous_score} / 100
PREVIOUS SUGGESTIONS GIVEN: {previous_suggestions}

UPDATED RESUME: {updated_resume}
JOB DESCRIPTION: {job_description}

Now re-analyze and:
1. Give the NEW ATS score
2. Show which suggestions were implemented ✅ and which were missed ❌
3. List any REMAINING improvements
4. Show score comparison: Before → After
5. If score increased, congratulate and suggest final polish tips
6. If score didn't increase enough, give more specific targeted fixes
"""

# -------------------------------------------------------------------
# KEYWORD EXTRACTION HELPER PROMPT
# -------------------------------------------------------------------
ATS_KEYWORD_EXTRACTOR_PROMPT = """
Given this job description, extract ALL ATS-relevant keywords organized by category:

JOB DESCRIPTION:
{job_description}

Return as structured JSON:
{{
  "hard_skills": ["..."],
  "soft_skills": ["..."],
  "tools_technologies": ["..."],
  "certifications": ["..."],
  "action_verbs": ["..."],
  "industry_terms": ["..."],
  "qualifications": ["..."],
  "experience_level": "...",
  "domain": "..."
}}
"""

# -------------------------------------------------------------------
# SECTION-SPECIFIC IMPROVEMENT PROMPTS
# -------------------------------------------------------------------
ATS_SUMMARY_IMPROVER_PROMPT = """
The user's Professional Summary is weak. Based on their resume and the job description,
write 3 improved versions of their Professional Summary that are ATS-optimized.

CURRENT SUMMARY: {current_summary}
FULL RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

Rules:
- Include 5-7 JD keywords naturally
- Start with a strong adjective + role title
- Include years of experience
- Include 1-2 quantified achievements
- Keep it to 3-4 lines
- Don't lie or invent experience they don't have
"""

ATS_EXPERIENCE_IMPROVER_PROMPT = """
The user's Work Experience bullets are weak. Rewrite each bullet to be ATS-optimized
using the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]"

CURRENT EXPERIENCE SECTION: {current_experience}
FULL RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

For each bullet:
1. Original → Improved
2. Add relevant JD keywords naturally
3. Add quantifiable metrics where possible (if not given, suggest realistic estimates with "~")
4. Start with a strong action verb
5. Show impact/result
"""

ATS_SKILLS_IMPROVER_PROMPT = """
The user's Skills section is missing important keywords from the JD.

CURRENT SKILLS: {current_skills}
FULL RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

Do the following:
1. List all JD keywords NOT in current skills → "Must Add"
2. Based on what they already know, infer related skills → "Likely Know (Add These)"
3. Industry-standard skills for this role → "Industry Standard (Add If True)"
4. Organize skills into categories: Technical, Tools & Platforms, Soft Skills, Certifications
5. Format as ATS-friendly skills section they can copy-paste
"""

# -------------------------------------------------------------------
# MISSING SECTION GENERATOR PROMPTS
# -------------------------------------------------------------------
ATS_MISSING_CERTIFICATIONS_PROMPT = """
The user is missing a Certifications section. Based on their resume and the JD,
suggest relevant certifications they could pursue or already hold but forgot to mention.

RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

Return:
1. Certifications explicitly mentioned in JD (must-have)
2. Certifications commonly expected for this role (nice-to-have)
3. Free/quick certifications they can get online
4. Format the section as it should appear on their resume
"""

ATS_MISSING_PROJECTS_PROMPT = """
The user is missing a Projects section. Based on their skills and the JD,
suggest project ideas they could add and how to write them ATS-style.

RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

Return:
1. 3-4 project suggestions based on JD requirements + their existing skills
2. Each project with: Title, Tech Stack, 2-3 bullet points (XYZ format), GitHub link placeholder
3. Format as it should appear on their resume
"""

ATS_MISSING_ACHIEVEMENTS_PROMPT = """
The user is missing an Achievements/Awards section. Based on their experience,
suggest achievements they could highlight and how to write them.

RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

Return:
1. Inferred achievements from their experience (ask them to verify/modify)
2. Industry-standard achievements for their role level
3. How to quantify each achievement
4. Format as it should appear on their resume
"""