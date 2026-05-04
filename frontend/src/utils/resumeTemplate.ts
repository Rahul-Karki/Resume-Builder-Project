import { templates as templateCatalog } from "@/data/templateMeta";

const CANONICAL_TEMPLATE_IDS = [
  "classic",
  "executive",
  "modern",
  "compact",
  "sidebar",
  "scholarly",
  "research",
  "chronological",
  "functional",
  "combination",
  "traditional-assistant",
  "community-impact",
] as const;

const LEGACY_TEMPLATE_ALIASES: Record<string, (typeof CANONICAL_TEMPLATE_IDS)[number]> = {
  "classic-template": "classic",
  "executive-template": "executive",
  "modern-template": "modern",
  "compact-template": "compact",
  "sidebar-template": "sidebar",
  "scholarly-template": "scholarly",
  "research-template": "research",
  "chronological-template": "chronological",
  "functional-template": "functional",
  "combination-template": "combination",
  "traditional-assistant-template": "traditional-assistant",
  "administrative-assistant-template": "traditional-assistant",
  "community-impact-template": "community-impact",
  "volunteer-template": "community-impact",
  "simple-volunteer-template": "community-impact",
  academic: "scholarly",
  "academic-template": "scholarly",
  "research-template-academic": "research",
  "two-column": "sidebar",
  "two-column-template": "sidebar",
};

const CANONICAL_TEMPLATE_ID_SET = new Set<string>(CANONICAL_TEMPLATE_IDS);

const slugifyTemplateId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeResumeTemplateId = (templateId: unknown): string => {
  if (typeof templateId !== "string") {
    return "classic";
  }

  const trimmedTemplateId = templateId.trim();
  if (!trimmedTemplateId) {
    return "classic";
  }

  if (CANONICAL_TEMPLATE_ID_SET.has(trimmedTemplateId)) {
    return trimmedTemplateId;
  }

  const slugifiedTemplateId = slugifyTemplateId(trimmedTemplateId);
  if (CANONICAL_TEMPLATE_ID_SET.has(slugifiedTemplateId)) {
    return slugifiedTemplateId;
  }

  return LEGACY_TEMPLATE_ALIASES[slugifiedTemplateId] ?? "classic";
};

export const isTechResumeTemplate = (templateId: unknown): boolean => {
  const normalizedTemplateId = normalizeResumeTemplateId(templateId);
  return templateCatalog.some((template) => template.id === normalizedTemplateId && template.category === "tech");
};
