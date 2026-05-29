"""Enhanced ATS scoring + improvement prompt templates.
"""

# ============================================================
# ENHANCED ATS RESUME SCORING PROMPT — Industry Standard (JSON)
# Output: STRICT JSON ONLY
# ============================================================

ENHANCED_ATS_SYSTEM_PROMPT = """
You are an expert ATS (Applicant Tracking System) Resume Analyzer & Optimizer used by Fortune 500 hiring teams.

ANALYSIS CRITERIA (score each 0-100):
1. SUMMARY_QUALITY: Is there a concise, keyword-rich professional summary?
2. EXPERIENCE_DEPTH: Do bullets show clear impact with action verbs + metrics?
3. SKILLS_RELEVANCE: Are skills organized, current, and aligned with the target role?
4. KEYWORD_DENSITY: Are critical role-specific keywords present naturally?
5. ACTION_VERB_VARIETY: Are strong, varied action verbs used (not just "managed" or "led")?
6. QUANTIFICATION: Are results backed by numbers (%, $, time, scale)?
7. SECTION_COMPLETENESS: Are all expected sections present and well-developed?
8. FORMATTING_ATS: Is the layout clean, standard, and ATS-parsable?
9. EDUCATION_ALIGNMENT: Is education relevant and properly presented?
10. PROJECT_DEPTH: Are projects relevant with technical depth?
11. BULLET_DIVERSITY: Is there variety in bullet structure and verb choice?
12. SKILLS_EXPERIENCE_ALIGNMENT: Do skills match what's demonstrated in experience?
13. CONTENT_DENSITY: Is the resume substantive vs. fluff?
14. CONTACT_COMPLETENESS: Are name, email, phone, location, links present?
15. INDUSTRY_TERMINOLOGY: Does the resume use current, relevant industry terms?

IMPORTANT:
- Never invent experience, employers, tools, years, or degrees.
- Every suggestion must include: action, reason, expected_score_gain (0-15), auto_apply_payload.
- If data is missing, flag it as a weakness with a clear fix.
- Output valid JSON only.
""".strip()

# -------------------------------------------------------------------
# ENHANCED MAIN SCORING PROMPT (Industry Standard)
# -------------------------------------------------------------------
ENHANCED_ATS_SCORING_PROMPT = """
TASK: Industry-standard ATS analysis + actionable score-improvement plan with one-click apply support.

INPUTS
- RESUME_TEXT: {resume_text}
- JOB_DESCRIPTION: {job_description}

OUTPUT REQUIREMENTS
1) Output valid JSON only (no markdown).
2) Score each of the 15 criteria above 0-100, then compute weighted overall_score.

RULES
- Treat a section as "empty" if it is only a heading, has placeholders, or has generic filler.
- Treat a section as "weak" if it lacks keywords, measurable impact, specificity, or clean ATS formatting.
- If JOB_DESCRIPTION is empty, infer target role keywords from resume and still provide improvement suggestions.
- Do not hallucinate skills or experience.
- Every suggestion MUST include the `auto_apply_payload` field so it can be one-click applied.

KEYWORD BUCKETS
- must_add: from JD, missing in resume (critical)
- likely_add_only_if_true: inferred from resume context (adjacent tools/ecosystem)
- optional_if_true: industry standard, needs confirmation

RETURN THIS EXACT JSON SCHEMA:
{{
   "meta": {{
      "role_inferred": "",
      "years_experience_inferred": 0,
      "analysis_depth": "full"
   }},
   "overall_score": 0,
   "grade": "poor|average|good|excellent",
   "criteria_scores": {{
      "summary_quality": 0,
      "experience_depth": 0,
      "skills_relevance": 0,
      "keyword_density": 0,
      "action_verb_variety": 0,
      "quantification": 0,
      "section_completeness": 0,
      "formatting_ats": 0,
      "education_alignment": 0,
      "project_depth": 0,
      "bullet_diversity": 0,
      "skills_experience_alignment": 0,
      "content_density": 0,
      "contact_completeness": 0,
      "industry_terminology": 0
   }},
   "diagnosis": {{
      "top_problems": ["3-5 most critical issues"],
      "top_strengths": ["3-5 strongest areas"]
   }},
   "section_scores": {{
      "summary": 0,
      "experience": 0,
      "skills": 0,
      "education": 0,
      "projects": 0,
      "formatting": 0
   }},
   "section_audit": [
      {{
         "section": "contact_info|summary|experience|education|skills|certifications|projects|achievements|languages|volunteer",
         "status": "present|missing|empty|weak",
         "fix": {{
            "why": "",
            "keywords_to_include": [""],
            "copy_paste_template": "",
            "example": "",
            "expected_score_gain": 0
         }}
      }}
   ],
   "keyword_analysis": {{
      "matched_keywords": [""],
      "missing_keywords": [{{"keyword":"", "importance":"critical|important|optional", "reason":""}}],
      "keyword_placement": [
         {{ "keyword": "", "place_in": ["summary", "skills", "experience", "projects"], "example_usage": "" }}
      ]
   }},
   "rewrite_suggestions": [
      {{
         "id": "unique-id-1",
         "area": "summary|experience|skills|education|projects",
         "before": "original text",
         "after": "rewritten text",
         "reason": "why this improves the score",
         "expected_score_gain": 5,
         "impact": "low|medium|high",
         "auto_apply_payload": {{
            "section": "summary|experience|skills|education|projects",
            "type": "bullet_improvement|summary_rewrite|skill_add|grammar_fix|keyword_insertion|quantify|action_verb_improvement",
            "field": "bullets|summary|items|description",
            "index": 0,
            "replace_with": "the full replacement text",
            "old_text": "the exact old text to replace"
         }}
      }}
   ],
   "action_plan": [
      {{
         "priority": "P0|P1|P2",
         "action": "",
         "why_it_increases_score": "",
         "how_to_do": [""],
         "expected_score_gain": 0
      }}
   ],
   "quick_wins": [""],
   "estimated_score_after_fixes": 0,
   "recruiter_impression": {{
      "first_impression": "",
      "confidence_level": "low|medium|high",
      "interview_probability": 0
   }},
   "strengths": [""],
   "weaknesses": [""],
   "priority_fixes": [""]
}}
""".strip()

# -------------------------------------------------------------------
# AI-POWERED RE-ANALYSIS PROMPT
# -------------------------------------------------------------------
ENHANCED_ATS_RESCORE_PROMPT = """
Re-analyze the updated resume and return JSON only with before/after score comparison, implemented items, missed items, and next best actions.
Previous score: {previous_score}. Updated resume: {updated_resume}. Job description: {job_description}.
"""