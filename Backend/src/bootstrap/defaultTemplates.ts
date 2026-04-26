import Template, { ITemplate } from "../models/Template";
import User from "../models/User";
import { invalidateRedisCache, redisCacheScopes } from "../middleware/redisCache";
import { logger } from "../observability";

type DefaultTemplateDefinition = {
  layoutId: string;
  name: string;
  description: string;
  category: ITemplate["category"];
  tag: string;
  isPremium: boolean;
  sortOrder: number;
  status: ITemplate["status"];
  cssVars: Partial<ITemplate["cssVars"]>;
  slots: Partial<ITemplate["slots"]>;
};

const DEFAULT_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    layoutId: "classic",
    name: "Classic",
    description: "Clean serif typography trusted by finance, law and academia.",
    category: "professional",
    tag: "Timeless",
    isPremium: false,
    sortOrder: 10,
    status: "published",
    cssVars: {
      accentColor: "#1a1a1a",
      headingColor: "#111111",
      textColor: "#333333",
      mutedColor: "#666666",
      borderColor: "#cccccc",
      backgroundColor: "#FAF8F5",
      bodyFont: "EB Garamond, serif",
      headingFont: "EB Garamond, serif",
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
  },
  {
    layoutId: "executive",
    name: "Executive",
    description: "Navy header with strong hierarchy for leadership roles.",
    category: "corporate",
    tag: "Corporate",
    isPremium: false,
    sortOrder: 20,
    status: "published",
    cssVars: {
      accentColor: "#1B2B4B",
      headingColor: "#1B2B4B",
      textColor: "#333333",
      mutedColor: "#3A5A8A",
      borderColor: "#C9D3E6",
      backgroundColor: "#EEF1F7",
      bodyFont: "IBM Plex Sans, sans-serif",
      headingFont: "Playfair Display, serif",
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
  },
  {
    layoutId: "modern",
    name: "Modern",
    description: "Teal accent rule and skill chips. Built for tech and startups.",
    category: "technical",
    tag: "Tech-Ready",
    isPremium: false,
    sortOrder: 30,
    status: "published",
    cssVars: {
      accentColor: "#0F766E",
      headingColor: "#134E4A",
      textColor: "#333333",
      mutedColor: "#0F766E",
      borderColor: "#BBF7D0",
      backgroundColor: "#F0FDFB",
      bodyFont: "DM Sans, sans-serif",
      headingFont: "DM Sans, sans-serif",
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
  },
  {
    layoutId: "compact",
    name: "Compact",
    description: "Information-dense label-column layout for senior candidates.",
    category: "professional",
    tag: "One-Page",
    isPremium: true,
    sortOrder: 40,
    status: "published",
    cssVars: {
      accentColor: "#111111",
      headingColor: "#111111",
      textColor: "#333333",
      mutedColor: "#666666",
      borderColor: "#cccccc",
      backgroundColor: "#F8F8F8",
      bodyFont: "IBM Plex Sans, sans-serif",
      headingFont: "IBM Plex Sans, sans-serif",
      fontSize: "9.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
  },
  {
    layoutId: "sidebar",
    name: "Sidebar",
    description: "Dark sidebar with two-column structure. Striking and scannable.",
    category: "creative",
    tag: "Structured",
    isPremium: true,
    sortOrder: 50,
    status: "published",
    cssVars: {
      accentColor: "#1E293B",
      headingColor: "#1E293B",
      textColor: "#334155",
      mutedColor: "#94A3B8",
      borderColor: "#334155",
      backgroundColor: "#ffffff",
      bodyFont: "Nunito Sans, sans-serif",
      headingFont: "Nunito Sans, sans-serif",
      fontSize: "10pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
  },
  {
    layoutId: "scholarly",
    name: "Scholarly",
    description: "Centered academic layout with classic headings and balanced spacing.",
    category: "academic",
    tag: "Academic",
    isPremium: false,
    sortOrder: 60,
    status: "published",
    cssVars: {
      accentColor: "#1a1a1a",
      headingColor: "#1a1a1a",
      textColor: "#2f2f2f",
      mutedColor: "#4a4a4a",
      borderColor: "#8d8d8d",
      backgroundColor: "#ffffff",
      bodyFont: "Source Serif 4, serif",
      headingFont: "Playfair Display, serif",
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: true,
    },
  },
  {
    layoutId: "research",
    name: "Research",
    description: "Publication-style hierarchy tuned for research-heavy resumes.",
    category: "academic",
    tag: "Detailed",
    isPremium: false,
    sortOrder: 70,
    status: "published",
    cssVars: {
      accentColor: "#1f1f1f",
      headingColor: "#1f1f1f",
      textColor: "#2f2f2f",
      mutedColor: "#555555",
      borderColor: "#8d8d8d",
      backgroundColor: "#ffffff",
      bodyFont: "Source Serif 4, serif",
      headingFont: "Playfair Display, serif",
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: true,
    },
  },
];

export async function ensureDefaultTemplatesInBackend(): Promise<void> {
  const admin = await User.findOne({ role: { $in: ["admin", "superadmin"] } })
    .select("_id role")
    .lean<{ _id: unknown; role: string }>();

  if (!admin?._id) {
    logger.warn("Skipping default template bootstrap: no admin/superadmin user found");
    return;
  }

  const adminId = String(admin._id);
  let insertedCount = 0;

  for (const definition of DEFAULT_TEMPLATES) {
    const result = await Template.updateOne(
      { layoutId: definition.layoutId },
      {
        $setOnInsert: {
          ...definition,
          thumbnailUrl: "",
          createdBy: adminId,
          updatedBy: adminId,
          publishedAt: definition.status === "published" ? new Date() : null,
        },
      },
      { upsert: true },
    );

    insertedCount += result.upsertedCount ?? 0;
  }

  if (insertedCount > 0) {
    await invalidateRedisCache([
      redisCacheScopes.publicTemplates,
      redisCacheScopes.adminTemplates,
      redisCacheScopes.adminDashboard,
      redisCacheScopes.adminAnalytics,
    ]);
  }

  logger.info(
    {
      insertedCount,
      catalogSize: DEFAULT_TEMPLATES.length,
    },
    "Default template bootstrap finished",
  );
}
