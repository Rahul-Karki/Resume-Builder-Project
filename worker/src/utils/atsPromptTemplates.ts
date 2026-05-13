import { existsSync, readFileSync } from "fs";
import path from "path";

const PROMPT_FILE_CANDIDATES = (fileName: string) => [
  path.resolve(__dirname, "../../../prompts", fileName),
  path.resolve(__dirname, "../../../../prompts", fileName),
  path.resolve(process.cwd(), "prompts", fileName),
];

const readPromptFile = (fileName: string) => {
  for (const candidate of PROMPT_FILE_CANDIDATES(fileName)) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf8");
    }
  }

  throw new Error(`Unable to locate prompt template file: ${fileName}`);
};

const extractPromptConstant = (source: string, constantName: string) => {
  const pattern = new RegExp(`${constantName}\\s*=\\s*"""([\\s\\S]*?)"""`);
  const match = source.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Unable to parse ${constantName} from prompt template source`);
  }

  return match[1].trim();
};

const enhancedPromptSource = readPromptFile("enhanced_ats_prompt.py");

export const ENHANCED_ATS_SYSTEM_PROMPT = extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_SYSTEM_PROMPT");
export const ENHANCED_ATS_SCORING_PROMPT = extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_SCORING_PROMPT");
export const ENHANCED_ATS_RESCORE_PROMPT = extractPromptConstant(enhancedPromptSource, "ENHANCED_ATS_RESCORE_PROMPT");

export const buildEnhancedAtsUserPrompt = (resumeText: string, jobDescription: string) =>
  ENHANCED_ATS_SCORING_PROMPT
    .replace("{resume_text}", resumeText)
    .replace("{job_description}", jobDescription);
