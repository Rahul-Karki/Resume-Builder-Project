import { Request, Response, NextFunction } from "express";
import { logger } from "../observability";

/**
 * Validation rules for AI requests.
 * Ensures inputs are within acceptable bounds and format.
 */

export interface AiValidationRules {
  maxTextLength?: number;
  maxContextLength?: number;
  maxTargetRoleLength?: number;
  requiredFields?: string[];
  allowedSections?: string[];
}

const DEFAULT_RULES: AiValidationRules = {
  maxTextLength: 2500,
  maxContextLength: 1000,
  maxTargetRoleLength: 160,
  requiredFields: ["text", "section"],
  allowedSections: ["summary", "experience", "education", "skills", "projects", "certifications", "languages"],
};

/**
 * Validate AI request input parameters.
 * Prevents abuse and ensures data integrity.
 */
export const validateAiInput = (
  body: unknown,
  rules: AiValidationRules = DEFAULT_RULES
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body is required and must be an object"] };
  }

  const data = body as Record<string, unknown>;

  // Check required fields
  for (const field of rules.requiredFields || []) {
    if (!(field in data) || !data[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate text field
  if ("text" in data) {
    const text = data.text;
    if (typeof text !== "string") {
      errors.push("Field 'text' must be a string");
    } else if (text.trim().length === 0) {
      errors.push("Field 'text' cannot be empty");
    } else if (text.length > (rules.maxTextLength || 2500)) {
      errors.push(`Field 'text' exceeds maximum length of ${rules.maxTextLength} characters`);
    }
  }

  // Validate section field
  if ("section" in data) {
    const section = data.section;
    if (typeof section !== "string") {
      errors.push("Field 'section' must be a string");
    } else if (!((rules.allowedSections || DEFAULT_RULES.allowedSections)!.includes(section))) {
      errors.push(
        `Field 'section' must be one of: ${((rules.allowedSections || DEFAULT_RULES.allowedSections) || []).join(", ")}`
      );
    }
  }

  // Validate context field (if present)
  if ("context" in data && data.context !== undefined) {
    const context = data.context;
    if (typeof context !== "string") {
      errors.push("Field 'context' must be a string");
    } else if (context.length > (rules.maxContextLength || 1000)) {
      errors.push(`Field 'context' exceeds maximum length of ${rules.maxContextLength} characters`);
    }
  }

  // Validate targetRole field (if present)
  if ("targetRole" in data && data.targetRole !== undefined) {
    const targetRole = data.targetRole;
    if (typeof targetRole !== "string") {
      errors.push("Field 'targetRole' must be a string");
    } else if (targetRole.length > (rules.maxTargetRoleLength || 160)) {
      errors.push(`Field 'targetRole' exceeds maximum length of ${rules.maxTargetRoleLength} characters`);
    }
  }

  // Validate tone field (if present)
  if ("tone" in data && data.tone !== undefined) {
    const tone = data.tone;
    const validTones = ["professional", "concise", "technical", "leadership-focused"];
    if (typeof tone !== "string" || !validTones.includes(tone)) {
      errors.push(`Field 'tone' must be one of: ${validTones.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize AI input to prevent prompt injection and other attacks.
 */
export const sanitizeAiInput = (text: string): string => {
  // Remove null bytes
  let sanitized = text.replace(/\0/g, "");

  // Remove excessive newlines (max 10 consecutive)
  sanitized = sanitized.replace(/\n{11,}/g, "\n\n\n");

  // Trim to reasonable length
  sanitized = sanitized.substring(0, 2500);

  return sanitized.trim();
};

/**
 * Middleware to validate AI request inputs.
 */
export const aiValidationMiddleware = (
  rules: AiValidationRules = DEFAULT_RULES
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = validateAiInput(req.body, rules);

    if (!validation.valid) {
      const requestId = String(req.headers["x-request-id"] || "");
      const userId = (req.user as Record<string, unknown> | undefined)?.id || "unknown";

      logger.warn(
        {
          requestId,
          userId,
          path: req.path,
          errors: validation.errors,
        },
        "AI request validation failed"
      );

      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters",
          details: validation.errors,
        },
      });
    }

    // Sanitize text fields in request body
    if (req.body && typeof req.body === "object") {
      const data = req.body as Record<string, unknown>;
      if (typeof data.text === "string") {
        data.text = sanitizeAiInput(data.text);
      }
      if (typeof data.context === "string") {
        data.context = sanitizeAiInput(data.context);
      }
      if (typeof data.targetRole === "string") {
        data.targetRole = sanitizeAiInput(data.targetRole);
      }
    }

    next();
  };
};

/**
 * Validate AI response structure before returning to client.
 */
export const validateAiResponse = (
  response: unknown
): response is Record<string, unknown> => {
  if (!response || typeof response !== "object") {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // Check for AiRewriteResult shape
  if ("suggestions" in obj) {
    const suggestions = obj.suggestions;
    if (!Array.isArray(suggestions)) return false;
    if (suggestions.length === 0) return false;
    // Check first suggestion has required fields
    const first = suggestions[0] as Record<string, unknown>;
    return (
      "suggestionText" in first &&
      "originalText" in first &&
      typeof first.suggestionText === "string" &&
      typeof first.originalText === "string"
    );
  }

  // Check for AiGrammarResult shape
  if ("issues" in obj && "correctedText" in obj) {
    return (
      Array.isArray(obj.issues) &&
      typeof obj.correctedText === "string"
    );
  }

  return false;
};

/**
 * Detect potentially hallucinated or suspicious AI responses.
 */
export const detectHallucinations = (response: unknown): { suspicious: boolean; reason?: string } => {
  if (!response || typeof response !== "object") {
    return { suspicious: true, reason: "Response is not an object" };
  }

  const obj = response as Record<string, unknown>;

  // Too many suggestions might indicate hallucination
  if (Array.isArray(obj.suggestions) && obj.suggestions.length > 10) {
    return { suspicious: true, reason: "Unusually high number of suggestions" };
  }

  // Check for empty or very short suggestions
  if (Array.isArray(obj.suggestions)) {
    const badSuggestions = obj.suggestions.filter((s) => {
      if (typeof s !== "object") return true;
      const suggestion = s as Record<string, unknown>;
      const text = suggestion.suggestionText;
      return typeof text !== "string" || text.trim().length < 5;
    });

    if (badSuggestions.length > 0) {
      return { suspicious: true, reason: "Contains suspiciously short suggestions" };
    }
  }

  // Check for NaN or invalid JSON
  const str = JSON.stringify(obj);
  if (str.includes("NaN") || str.includes("Infinity")) {
    return { suspicious: true, reason: "Contains invalid JSON values" };
  }

  return { suspicious: false };
};
