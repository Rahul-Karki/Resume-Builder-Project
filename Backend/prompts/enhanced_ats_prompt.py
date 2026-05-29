"""Enhanced ATS scoring + improvement prompt templates.

Formatting note:
- Many prompts in this file are intended to be used with Python `.format(...)`.
- Only placeholders that should be replaced by the caller use `{like_this}`.
- If you introduce new `{placeholders}`, update the call site accordingly.
"""

# ============================================================
# ENHANCED ATS RESUME SCORING PROMPT — Ultra Advanced (JSON)
# Output: STRICT JSON ONLY
# ============================================================

ENHANCED_ATS_SYSTEM_PROMPT = """
You are an expert ATS (Applicant Tracking System) Resume Analyzer & Optimizer.

Goals:
1) Provide a realistic ATS score (0-100) with a clear breakdown.
2) Explain exactly how to increase the score:
   - If any section is missing OR empty → give a ready-to-add template + example.
   - If a section is weak → rewrite it using role keywords and measurable outcomes.
3) Provide keyword suggestions:
   - must_add (from JD)
   - likely_add_only_if_true (inferred from resume content)
   - optional_if_true (industry standard, needs user confirmation)

Rules:
- Never invent experience, employers, tools, years, or degrees.
- If data is missing, ask short questions.
- Output must be valid JSON only.
""".strip()

# -------------------------------------------------------------------
# ENHANCED MAIN SCORING PROMPT
# -------------------------------------------------------------------
ENHANCED_ATS_SCORING_PROMPT = """
TASK: Enhanced ATS analysis + personalized score-increase plan.

INPUTS
- RESUME_TEXT: {resume_text}
- JOB_DESCRIPTION: {job_description}

OUTPUT REQUIREMENTS
1) Output valid JSON only (no markdown).
2) Use the same language as the resume; if mixed/unclear, output Hinglish.

INTERPRETATION RULES
- Treat a section as "empty" if it is only a heading, has placeholders, or has generic filler.
- Treat a section as "weak" if it lacks keywords, measurable impact, specificity, or clean ATS formatting.
- If JOB_DESCRIPTION is empty, infer target role keywords from resume and still provide improvement suggestions.

KEYWORD RULES
- Do not hallucinate skills.
- Provide keywords in three buckets:
   - must_add: from JD, missing
   - likely_add_only_if_true: inferred from resume context (adjacent tools/ecosystem)
   - optional_if_true: industry standard, needs confirmation
- For every missing keyword, recommend *where* to add it (summary/skills/experience/projects).

RETURN THIS JSON SCHEMA
{{
   "overall_score": 0,
   "grade": "poor|average|good|excellent",
   "diagnosis": {{
      "top_problems": [""],
      "top_strengths": [""]
   }},
   "section_scores": {{
      "contact_info": 0,
      "summary": 0,
      "experience": 0,
      "skills": 0,
      "education": 0,
      "projects": 0,
      "formatting": 0,
      "keyword_match": 0
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
      "jd_keywords": {{
         "hard_skills": [""],
         "tools_technologies": [""],
         "soft_skills": [""],
         "industry_terms": [""],
         "certifications": [""],
         "action_verbs": [""]
      }},
      "matched_keywords": [""],
      "missing_keywords": [{{"keyword":"", "importance":"critical|important|optional", "reason":""}}],
      "keyword_buckets": {{
         "must_add": [""],
         "likely_add_only_if_true": [""],
         "optional_if_true": [""]
      }},
      "keyword_placement": [
         {{ "keyword": "", "place_in": ["summary", "skills", "experience", "projects"], "example_usage": "" }}
      ]
   }},
   "copy_paste_snippets": {{
      "summary_options": [""],
      "skills_section": "",
      "experience_bullets": [{{"before":"","after":""}}],
      "projects_section": ""
   }},
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
   "questions_for_user": [""],
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
The user has implemented improvements based on your suggestions. Now re-analyze with enhanced AI capabilities.

=== INPUTS ===
PREVIOUS SCORE: {previous_score} / 100
PREVIOUS SUGGESTIONS: {previous_suggestions}
UPDATED RESUME: {updated_resume}
JOB DESCRIPTION: {job_description}

=== AI RE-ANALYSIS TASK ===

1. **Score Comparison Analysis**:
   - Current Score: ___ / 100
   - Previous Score: ___ / 100
   - Improvement: +___ points
   - Improvement Percentage: ___%

2. **Implementation Tracking**:
   ✅ Successfully Implemented: (list what was implemented)
   ❌ Missed Opportunities: (list what is still missing)
   🔄 Partially Implemented: (list partial implementations)

3. **Remaining Opportunities**:
   - Additional improvements possible: ___ points
   - Quick wins still available: (remaining quick wins)
   - Advanced optimizations: (advanced optimizations)

4. **Final Recommendations**:
   - If score > 85: "Excellent! Your resume is now highly ATS-competitive. Consider final polish touches."
   - If score 70-85: "Good progress! Focus on [remaining_critical_items] for even better results."
   - If score < 70: "Significant improvement needed. Focus on [major_improvement_areas]."

5. **Next Steps**:
   - Immediate actions: (immediate actions)
   - Long-term optimizations: (long-term actions)
"""

# -------------------------------------------------------------------
# AI-POWERED SECTION GENERATORS
# -------------------------------------------------------------------
ENHANCED_MISSING_SECTION_GENERATOR = """
Generate a complete {section_type} section based on the resume and job description.

=== CONTEXT ===
RESUME: {resume_text}
JOB DESCRIPTION: {job_description}

=== REQUIREMENTS ===
1. **Must Include**: {required_elements}
2. **Keywords to Use**: {target_keywords}
3. **ATS Format**: {ats_format}
4. **Length**: {length_requirement}
5. **Tone**: {tone_requirement}

=== OUTPUT FORMAT ===
**Section Header**: {section_header}

{section_content}
"""

# -------------------------------------------------------------------
# AI-POWERED KEYWORD ENHANCER
# -------------------------------------------------------------------
ENHANCED_KEYWORD_ENHANCER_PROMPT = """
Enhance the resume with AI-powered keyword suggestions based on existing content and job requirements.

=== INPUTS ===
RESUME CONTENT: {resume_content}
EXTRACTED KEYWORDS: {extracted_keywords}
JOB DESCRIPTION: {job_description}

=== AI ENHANCEMENT TASK ===

### 1. **Keyword Gap Analysis**:
- Missing Hard Skills: {missing_hard_skills}
- Missing Soft Skills: {missing_soft_skills}
- Missing Action Verbs: {missing_action_verbs}
- Missing Industry Terms: {missing_industry_terms}

### 2. **Smart Inference**:
Based on existing content, infer additional relevant skills:
- If they mention "React" → add "Redux, React Router, Hooks, Context API"
- If they say "managed team" → add "leadership, team management, mentoring"
- If they have "AWS experience" → add "S3, EC2, Lambda, CloudFormation"

### 3. **Enhanced Skills Organization**:
**Technical Skills**: {enhanced_technical_skills}
**Tools & Platforms**: {enhanced_tools_skills}
**Soft Skills**: {enhanced_soft_skills}
**Certifications**: {enhanced_certifications}

### 4. **Implementation Strategy**:
- Immediate Add: {immediate_add_keywords}
- Gradual Integration: {gradual_integration_keywords}
- Future Considerations: {future_considerations}
"""