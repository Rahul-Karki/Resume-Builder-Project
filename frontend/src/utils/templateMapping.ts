import { templates } from "@/data/templateMeta";

export type TemplateMeta = {
  id: string;
  name: string;
  tag: string;
  category: string;
  audience: string;
  description: string;
  isPremium: boolean;
  accent: string;
  palette: Record<string, string>;
};

function mapPalette(t: typeof templates[number]): Record<string, string> {
  const [bg = "#ffffff", primary = "#000000", secondary = "#666666", sidebar] = t.palette;
  const result: Record<string, string> = { bg, primary, secondary };
  if (sidebar) result.sidebar = sidebar;
  return result;
}

export const TEMPLATES: TemplateMeta[] = templates.map((t) => ({
  id: t.id,
  name: t.name,
  tag: t.tag,
  category: t.category === "tech" ? "Technical" : "Professional",
  audience: t.audience,
  description: t.description,
  isPremium: t.isPremium,
  accent: t.accent,
  palette: mapPalette(t),
}));