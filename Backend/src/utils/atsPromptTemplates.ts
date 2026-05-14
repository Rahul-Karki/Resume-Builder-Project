import { existsSync, readFileSync } from "fs";
import path from "path";

const PROMPT_FILE_CANDIDATES = (fileName: string) => [
  path.resolve(__dirname, "../../../prompts", fileName),
  path.resolve(__dirname, "../../../../../prompts", fileName),
  path.resolve(process.cwd(), "prompts", fileName),
  path.resolve(process.cwd(), "../prompts", fileName),
  path.resolve(process.cwd(), "../../prompts", fileName),
  path.resolve(process.cwd(), "../../../prompts", fileName),
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
  "You are an expert ATS (Applicant Tracking System) Resume Analyzer & Optimizer.",
  "Return valid JSON only.",
  "Never invent experience, employers, tools, metrics, or education details.",
].join("\n");

const DEFAULT_ENHANCED_ATS_SCORING_PROMPT = [
  "TASK: Enhanced ATS analysis + personalized score-increase plan.",
  "INPUTS",
  "- RESUME_TEXT: {resume_text}",
  "- JOB_DESCRIPTION: {job_description}",
  "OUTPUT REQUIREMENTS",
  "1) Output valid JSON only (no markdown).",
  "2) Include: overall_score, grade, section_scores, section_audit, keyword_analysis, rewrite_suggestions, action_plan, quick_wins, estimated_score_after_fixes, questions_for_user.",
].join("\n");

const DEFAULT_ENHANCED_ATS_RESCORE_PROMPT = [
  "Re-analyze the updated resume against the job description and return JSON only.",
  "Include before/after score comparison, implemented items, missed items, and next best actions.",
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