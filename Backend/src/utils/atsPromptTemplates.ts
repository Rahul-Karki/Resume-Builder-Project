import { existsSync, readFileSync } from "fs";
import path from "path";

const PROMPT_FILE_CANDIDATES = (fileName: string) => [
  path.resolve(__dirname, "../../../../prompts", fileName),
  path.resolve(__dirname, "../../prompts", fileName),
  path.resolve(process.cwd(), "prompts", fileName),
  path.resolve(process.cwd(), "../prompts", fileName),
];

const readPromptFile = (fileName: string) => {
  for (const candidate of PROMPT_FILE_CANDIDATES(fileName)) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf8");
    }
  }

  return null;
};

const extractPromptConstant = (source: string, constantName: string) => {
  const pattern = new RegExp(`${constantName}\\s*=\\s*"""([\\s\\S]*?)"""`);
  const match = source.match(pattern);
  return match?.[1]?.trim() ?? null;
};

const DEFAULT_ENHANCED_ATS_SYSTEM_PROMPT = [
  "You are an advanced ATS Resume Analyzer used in a production-level AI Resume Builder platform.",
  "The analysis must follow industry-standard hiring and resume screening practices.",
  "",
  "CORE GOALS:",
  "1. Calculate a highly accurate ATS compatibility score out of 100.",
  "2. Detect missing keywords, weak impact statements, formatting issues, parsing issues, section problems, poor metric usage, weak action verbs.",
  "3. Identify sections that are missing or empty and tell the user to fill them.",
  "4. Every suggestion must specify the section, explain WHY it hurts the ATS score, and describe what to improve.",
  "5. Rank suggestions by score impact — highest potential gain first.",
  "6. Align every suggestion with one of the 5 ATS scoring categories (keywordMatch, parsing, contentQuality, experienceRelevance, formatting) and state which category it improves.",
  "",
  "ATS SCORING CATEGORIES (weighted):",
  "1. KEYWORD_MATCH (30%): Role-specific keywords, hard skills, technologies, frameworks, keyword density.",
  "2. RESUME_STRUCTURE_PARSING (20%): ATS-readable formatting, proper headings, parsing compatibility, section organization.",
  "3. CONTENT_QUALITY (25%): Quantified achievements, measurable impact, clarity, strong bullet points, action-oriented language.",
  "4. EXPERIENCE_RELEVANCE (15%): Project relevance, experience alignment, domain alignment, technical depth.",
  "5. FORMATTING_CONSISTENCY (10%): Font consistency, spacing, date formatting, capitalization, readability.",
  "",
  "IMPORTANT RULES:",
  "- Never invent experience, employers, tools, years, or degrees — if a section is missing or empty, suggest filling it with real entries, do NOT create fake ones.",
  "- Detect weak bullets like 'responsible for', 'worked on', 'helped with' and suggest stronger rewrites.",
  "- Detect ATS-unfriendly formatting (tables, icons, multi-column, images, progress bars, unusual symbols).",
  "- Provide semantic keyword recommendations based on target job role, tech stack, and experience level.",
  "- Explain WHY each issue affects ATS systems.",
  "- Prioritize high-impact fixes first.",
  "- Simulate realistic recruiter behavior: first 6-second scan, keyword filtering, relevance ranking.",
  "- Output valid JSON only.",
].join("\n");

const DEFAULT_ENHANCED_ATS_SCORING_PROMPT = [
  "TASK: ATS score analysis with section-wise improvement suggestions.",
  "",
  "INPUTS:",
  "- RESUME_TEXT: {resume_text}",
  "- JOB_DESCRIPTION: {job_description}",
  "",
  "OUTPUT REQUIREMENTS:",
  "1) Output valid JSON only (no markdown).",
  "2) Score each of the 5 weighted categories 0-100 (keywordMatch, parsing, contentQuality, experienceRelevance, formatting), then compute overallScore.",
  "3) If JOB_DESCRIPTION is empty, infer target role keywords from resume and still provide improvement suggestions.",
  "4) Never hallucinate fake experience. Only suggest filling empty or weak sections.",
  "5) If a section is missing or empty, flag it and suggest what content to add.",
  "6) Order suggestions by importance — highest impact first.",
  "7) Each suggestion must reference which ATS category it improves (keywordMatch, parsing, contentQuality, experienceRelevance, formatting).",
  "",
  "RETURN THIS EXACT JSON SCHEMA:",
  "{",
  '   "overallScore": 0,',
  '   "summary": {',
  '      "strengths": ["3-5 key strengths"],',
  '      "weaknesses": ["3-5 critical weaknesses"],',
  '      "industryReadiness": "one-line assessment",',
  '      "recruiterImpression": "6-second scan verdict"',
  "   },",
  '   "categoryScores": {',
  '      "keywordMatch": 0,',
  '      "parsing": 0,',
  '      "contentQuality": 0,',
  '      "experienceRelevance": 0,',
  '      "formatting": 0',
  "   },",
  '   "missingKeywords": [',
  "      {",
  '         "keyword": "term",',
  '         "importance": "high|medium|low",',
  '         "reason": "why it is needed",',
  '         "suggestedPlacement": "summary|skills|experience|projects"',
  "      }",
  "   ],",
  '   "formatIssues": [',
  "      {",
  '         "id": "fmt-1",',
  '         "severity": "high|medium|low",',
  '         "section": "section name",',
  '         "problem": "what is wrong",',
  '         "reason": "why it hurts ATS",',
  '         "fixSuggestion": "how to fix it"',
  "      }",
  "   ],",
  '   "contentImprovements": [',
  "      {",
  '         "id": "ci-1",',
  '         "section": "summary|experience|skills|education|projects",',
  '         "original": "exact original text",',
  '         "improved": "improved text",',
  '         "reason": "why this improves the score",',
  '         "impact": "score impact description",',
  '         "atsGain": 0,',
  '         "atsCategory": "keywordMatch|parsing|contentQuality|experienceRelevance|formatting"',
  "      }",
  "   ],",
  '   "sectionAnalysis": [',
  "      {",
  '         "section": "section name",',
  '         "score": 0,',
  '         "issues": ["issue 1", "issue 2"],',
  '         "recommendations": ["rec 1", "rec 2"]',
  "      }",
  "   ],",
   '   "priorityFixes": [',
  "      {",
  '         "priority": 1,',
  '         "issue": "what to fix",',
  '         "expectedScoreIncrease": 0,',
  '         "atsCategory": "keywordMatch|parsing|contentQuality|experienceRelevance|formatting"',
  "      }",
  "   ],",
  '   "old_format_fields_for_backward_compat": {',
  '      "section_scores": { "summary": 0, "experience": 0, "skills": 0, "education": 0, "projects": 0, "formatting": 0 },',
  '      "rewrite_suggestions": [],',
  '      "action_plan": [],',
  '      "quick_wins": [],',
  '      "section_audit": [],',
  '      "formatting_fixes": [],',
  '      "keyword_analysis": { "matched_keywords": [], "missing_keywords": [] }',
  "   }",
  "}",
].join("\n");

const DEFAULT_ENHANCED_ATS_RESCORE_PROMPT = [
  "Re-analyze the updated resume and return JSON only with before/after score comparison, implemented items, missed items, and next best actions.",
  "Previous score: {previous_score}. Updated resume: {updated_resume}. Job description: {job_description}.",
].join("\n");

const enhancedPromptSource = readPromptFile("enhanced_ats_prompt.py");

if (!enhancedPromptSource) {
  console.warn("[backend] ATS prompt template file not found: enhanced_ats_prompt.py. Using built-in fallback prompts.");
}

export const ENHANCED_ATS_SYSTEM_PROMPT = enhancedPromptSource
  ? (extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_SYSTEM_PROMPT") ?? DEFAULT_ENHANCED_ATS_SYSTEM_PROMPT)
  : DEFAULT_ENHANCED_ATS_SYSTEM_PROMPT;

export const ENHANCED_ATS_SCORING_PROMPT = enhancedPromptSource
  ? (extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_SCORING_PROMPT") ?? DEFAULT_ENHANCED_ATS_SCORING_PROMPT)
  : DEFAULT_ENHANCED_ATS_SCORING_PROMPT;

export const ENHANCED_ATS_RESCORE_PROMPT = enhancedPromptSource
  ? (extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_RESCORE_PROMPT") ?? DEFAULT_ENHANCED_ATS_RESCORE_PROMPT)
  : DEFAULT_ENHANCED_ATS_RESCORE_PROMPT;

export const buildEnhancedAtsUserPrompt = (resumeText: string, jobDescription: string) =>
  ENHANCED_ATS_SCORING_PROMPT
    .replace("{resume_text}", resumeText)
    .replace("{job_description}", jobDescription);