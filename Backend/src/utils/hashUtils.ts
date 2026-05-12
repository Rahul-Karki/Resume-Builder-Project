import crypto from "crypto";

/**
 * Utility functions for creating consistent hashes for deduplication.
 */

/**
 * Create a SHA-256 hash of text content.
 * Used for creating consistent cache keys for identical requests.
 */
export const createTextHash = (text: string): string => {
  return crypto
    .createHash("sha256")
    .update(normalizeForHashing(text))
    .digest("hex")
    .substring(0, 16); // Use first 16 chars for shorter keys
};

/**
 * Normalize text before hashing to ensure consistent results.
 * Removes variations that don't affect the actual content.
 */
const normalizeForHashing = (text: string): string => {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\.{3,}/g, "...") // Normalize ellipsis
    .trim();
};

/**
 * Create a hash for resume content to ensure consistent styling.
 */
export const createResumeHash = (resume: Record<string, unknown>): string => {
  // Create a stable string representation of the resume
  const normalized = {
    personalInfo: normalizePersonalInfo(resume.personalInfo),
    sections: normalizeSections(resume.sections),
    styling: normalizeStyling(resume.styling),
  };
  
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(deepSort(normalized)))
    .digest("hex")
    .substring(0, 16);
};

/**
 * Normalize personal information section.
 */
const normalizePersonalInfo = (personalInfo: unknown): Record<string, unknown> => {
  if (!personalInfo || typeof personalInfo !== "object") {
    return {};
  }
  
  const normalized = { ...personalInfo as Record<string, unknown> };
  
  // Remove empty fields
  Object.keys(normalized).forEach(key => {
    if (!normalized[key] || String(normalized[key]).trim() === "") {
      delete normalized[key];
    }
  });
  
  return normalized;
};

/**
 * Normalize sections to ensure consistent ordering.
 */
const normalizeSections = (sections: unknown): Record<string, unknown[]> => {
  if (!sections || typeof sections !== "object") {
    return {};
  }
  
  const normalized = { ...sections as Record<string, unknown[]> };
  
  // Ensure each section is an array and normalize content
  Object.keys(normalized).forEach(sectionName => {
    const section = normalized[sectionName];
    if (!Array.isArray(section)) {
      normalized[sectionName] = [];
      return;
    }
    
    // Normalize each item in the section
    normalized[sectionName] = section.map(item => {
      if (!item || typeof item !== "object") {
        return {};
      }
      
      const normalizedItem = { ...item as Record<string, unknown> };
      
      // Clean up text fields
      Object.keys(normalizedItem).forEach(key => {
        if (typeof normalizedItem[key] === "string") {
          normalizedItem[key] = (normalizedItem[key] as string).trim();
        }
      });
      
      return normalizedItem;
    });
  });
  
  return normalized;
};

/**
 * Normalize styling configuration.
 */
const normalizeStyling = (styling: unknown): Record<string, unknown> => {
  if (!styling || typeof styling !== "object") {
    return {};
  }
  
  const normalized = { ...styling as Record<string, unknown> };
  
  // Remove undefined/null values
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined || normalized[key] === null) {
      delete normalized[key];
    }
  });
  
  return normalized;
};

/**
 * Recursively sort object keys for consistent JSON stringification.
 */
const deepSort = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => deepSort(item));
  }
  
  if (typeof value === "object" && value !== null) {
    const sorted: Record<string, unknown> = {};
    Object.keys(value)
      .sort()
      .forEach(key => {
        sorted[key] = deepSort((value as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  
  return value;
};

/**
 * Create a cache key for resume styling to ensure consistency between preview and download.
 */
export const createResumeStyleCacheKey = (resumeId: string, userId: string): string => {
  return `resume-style:${userId}:${resumeId}`;
};