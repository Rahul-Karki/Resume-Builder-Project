import {
  ResumeDocument, ResumeStyle, SectionVisibility, defaultStyle, defaultSectionVisibility,
} from "@/types/resume-types";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";
import { templates as localTemplateCatalog } from "@/data/templateMeta";

export const VALID_FONTS = new Set([
  "EB Garamond, serif",
  "Playfair Display, serif",
  "Lora, serif",
  "DM Sans, sans-serif",
  "IBM Plex Sans, sans-serif",
  "Nunito Sans, sans-serif",
  "Outfit, sans-serif",
  "Source Serif 4, serif",
]);

export const VALID_FONT_SIZES = new Set(["9pt", "9.5pt", "10pt", "10.5pt", "11pt", "11.5pt"]);
export const VALID_LINE_HEIGHTS = new Set(["1.3", "1.4", "1.5", "1.6", "1.7"]);

export const safeFont = (value: unknown, fallback: ResumeStyle["bodyFont"]): ResumeStyle["bodyFont"] => {
  if (typeof value === "string" && VALID_FONTS.has(value)) return value as ResumeStyle["bodyFont"];
  return fallback;
};

export const safeFontSize = (value: unknown, fallback: ResumeStyle["fontSize"]): ResumeStyle["fontSize"] => {
  if (typeof value === "string" && VALID_FONT_SIZES.has(value)) return value as ResumeStyle["fontSize"];
  return fallback;
};

export const safeLineHeight = (value: unknown, fallback: ResumeStyle["lineHeight"]): ResumeStyle["lineHeight"] => {
  if (typeof value === "string" && VALID_LINE_HEIGHTS.has(value)) return value as ResumeStyle["lineHeight"];
  return fallback;
};

export const TEMPLATE_STYLE_PRESETS: Record<string, Partial<typeof defaultStyle>> = {
  classic:   { accentColor: "#1a1a1a", bodyFont: "EB Garamond, serif", headingFont: "EB Garamond, serif" },
  executive: { accentColor: "#1B2B4B", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "Playfair Display, serif" },
  modern:    { accentColor: "#0F766E", bodyFont: "DM Sans, sans-serif", headingFont: "DM Sans, sans-serif" },
  compact:   { accentColor: "#111111", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "IBM Plex Sans, sans-serif", fontSize: "9.5pt" },
  sidebar:   { accentColor: "#1E293B", bodyFont: "Nunito Sans, sans-serif", headingFont: "Nunito Sans, sans-serif" },
  scholarly: { accentColor: "#1a1a1a", bodyFont: "EB Garamond, serif", headingFont: "EB Garamond, serif" },
  research:  { accentColor: "#1f1f1f", bodyFont: "Source Serif 4, serif", headingFont: "Playfair Display, serif" },
  chronological: { accentColor: "#1F2937", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "IBM Plex Sans, sans-serif", fontSize: "10pt" },
  functional: { accentColor: "#334155", bodyFont: "Outfit, sans-serif", headingFont: "Outfit, sans-serif", fontSize: "10pt" },
  combination: { accentColor: "#0B3C5D", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "Playfair Display, serif", fontSize: "10pt" },
  "traditional-assistant": { accentColor: "#1E3A8A", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "IBM Plex Sans, sans-serif", fontSize: "10pt" },
  "community-impact": { accentColor: "#166534", bodyFont: "Lora, serif", headingFont: "Lora, serif", fontSize: "10pt", lineHeight: "1.6" },
};

export const TEMPLATE_SECTION_VISIBILITY_PRESETS: Record<string, typeof defaultSectionVisibility> = {
  classic:   { ...defaultSectionVisibility },
  executive: { ...defaultSectionVisibility },
  modern:    { ...defaultSectionVisibility },
  compact:   { ...defaultSectionVisibility },
  sidebar:   { ...defaultSectionVisibility },
  scholarly: { ...defaultSectionVisibility },
  research:  { ...defaultSectionVisibility },
  chronological: { ...defaultSectionVisibility, projects: false, certifications: true },
  functional: { ...defaultSectionVisibility, projects: false, certifications: true, languages: true },
  combination: { ...defaultSectionVisibility, projects: false, certifications: true, languages: true },
  "traditional-assistant": { ...defaultSectionVisibility, projects: false, certifications: true },
  "community-impact": { ...defaultSectionVisibility, projects: false, certifications: true, languages: true },
};

export const SECTION_KEYS: Array<keyof SectionVisibility> = [
  "experience", "education", "skills", "projects", "certifications", "languages",
];

export const resolveTemplateCategory = (templateId: string, apiCategory?: string) => {
  if (apiCategory === "tech" || apiCategory === "non-tech") return apiCategory;
  const localTemplate = localTemplateCatalog.find((template) => template.id === templateId);
  return localTemplate?.category ?? "non-tech";
};

export const getTemplateBaseStyle = (templateId: string) => ({
  ...defaultStyle,
  ...(TEMPLATE_STYLE_PRESETS[templateId] ?? {}),
});

export const getTemplateBaseVisibility = (templateId: string) => ({
  ...(TEMPLATE_SECTION_VISIBILITY_PRESETS[templateId] ?? defaultSectionVisibility),
});

export const resolveTemplateConfig = (templateId: string) => {
  const normalizedTemplateId = normalizeResumeTemplateId(templateId);
  const baseStyle = getTemplateBaseStyle(normalizedTemplateId);
  const baseVisibility = getTemplateBaseVisibility(normalizedTemplateId);

  try {
    const matchedTemplate = localTemplateCatalog.find((template) => template.id === normalizedTemplateId);

    if (!matchedTemplate) {
      return {
        templateId: normalizedTemplateId,
        templateCategory: resolveTemplateCategory(normalizedTemplateId),
        style: baseStyle,
        sectionVisibility: baseVisibility,
      };
    }

    const cssVars = matchedTemplate.cssVars ?? {};
    const slots = matchedTemplate.slots ?? {};

    const resolvedStyle: ResumeStyle = {
      ...baseStyle,
      accentColor: cssVars.accentColor ?? baseStyle.accentColor,
      headingColor: cssVars.headingColor ?? baseStyle.headingColor,
      textColor: cssVars.textColor ?? baseStyle.textColor,
      mutedColor: cssVars.mutedColor ?? baseStyle.mutedColor,
      borderColor: cssVars.borderColor ?? baseStyle.borderColor,
      backgroundColor: cssVars.backgroundColor ?? baseStyle.backgroundColor,
      bodyFont: safeFont(cssVars.bodyFont, baseStyle.bodyFont),
      headingFont: safeFont(cssVars.headingFont, baseStyle.headingFont),
      fontSize: safeFontSize(cssVars.fontSize, baseStyle.fontSize),
      lineHeight: safeLineHeight(cssVars.lineHeight, baseStyle.lineHeight),
    };

    return {
      templateId: normalizedTemplateId,
      templateCategory: resolveTemplateCategory(normalizedTemplateId, matchedTemplate.category),
      style: resolvedStyle,
      sectionVisibility: {
        ...baseVisibility,
        experience: slots.experience ?? baseVisibility.experience,
        education: slots.education ?? baseVisibility.education,
        skills: slots.skills ?? baseVisibility.skills,
        projects: slots.projects ?? baseVisibility.projects,
        certifications: slots.certifications ?? baseVisibility.certifications,
        languages: slots.languages ?? baseVisibility.languages,
      },
    };
  } catch {
    return {
      templateId: normalizedTemplateId,
      templateCategory: resolveTemplateCategory(normalizedTemplateId),
      style: baseStyle,
      sectionVisibility: baseVisibility,
    };
  }
};

export const sectionHasContent = (resume: ResumeDocument, section: keyof SectionVisibility) => {
  const value = resume.sections[section];
  return Array.isArray(value) && value.length > 0;
};

export const mergeTemplateVisibilityForExistingResume = (
  resume: ResumeDocument,
  templateVisibility: SectionVisibility,
): SectionVisibility => {
  const nextVisibility = { ...templateVisibility };
  for (const section of SECTION_KEYS) {
    if (resume.sectionVisibility[section]) {
      nextVisibility[section] = true;
      continue;
    }
    if (sectionHasContent(resume, section)) {
      nextVisibility[section] = true;
    }
  }
  return nextVisibility;
};
