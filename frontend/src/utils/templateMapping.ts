import { templates } from "@/data/templateMeta";
import type { TemplateMeta, TemplateId } from "@/types/resume-types";

export type { TemplateMeta };

function mapPalette(t: typeof templates[number]): TemplateMeta["palette"] {
  const [bg = "#ffffff", primary = "#000000", secondary = "#666666", sidebar] = t.palette;
  const result: TemplateMeta["palette"] = { bg, primary, secondary };
  if (sidebar) result.sidebar = sidebar;
  return result;
}

export const TEMPLATES: TemplateMeta[] = templates.map((t) => ({
  id: t.id as TemplateId,
  name: t.name,
  tag: t.tag,
  category: t.category === "tech" ? "Technical" : "Professional",
  audience: t.audience as "tech" | "non-tech",
  description: t.description,
  isPremium: t.isPremium,
  accent: t.accent,
  palette: mapPalette(t),
}));