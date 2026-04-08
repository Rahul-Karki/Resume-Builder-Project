import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User from "../models/User";
import Template from "../models/Template";
import { UserRole } from "../enums/userRole";

dotenv.config();

type SeedTemplate = {
  layoutId: string;
  name: string;
  tag: string;
  category: "professional" | "corporate" | "technical" | "creative" | "academic";
  description: string;
  isPremium: boolean;
  accent: string;
  palette: {
    bg: string;
    primary: string;
    secondary: string;
  };
  bodyFont: string;
};

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    layoutId: "classic",
    name: "Classic",
    tag: "Timeless",
    category: "professional",
    description: "Timeless serif layout trusted by finance, law & academia.",
    isPremium: false,
    accent: "#1a1a1a",
    palette: { bg: "#FAF8F5", primary: "#1a1a1a", secondary: "#555555" },
    bodyFont: "EB Garamond, serif",
  },
  {
    layoutId: "executive",
    name: "Executive",
    tag: "Corporate",
    category: "corporate",
    description: "Navy header bar with strong hierarchy for leadership roles.",
    isPremium: false,
    accent: "#1B2B4B",
    palette: { bg: "#EEF1F7", primary: "#1B2B4B", secondary: "#3A5A8A" },
    bodyFont: "Playfair Display, serif",
  },
  {
    layoutId: "modern",
    name: "Modern",
    tag: "Tech-Ready",
    category: "technical",
    description: "Teal accent rule and skill chips built for tech startups.",
    isPremium: false,
    accent: "#0F766E",
    palette: { bg: "#F0FDFB", primary: "#0F766E", secondary: "#134E4A" },
    bodyFont: "DM Sans, sans-serif",
  },
  {
    layoutId: "compact",
    name: "Compact",
    tag: "One-Page",
    category: "professional",
    description: "Information-dense label-column layout for senior candidates.",
    isPremium: true,
    accent: "#111111",
    palette: { bg: "#F8F8F8", primary: "#111111", secondary: "#444444" },
    bodyFont: "IBM Plex Sans, sans-serif",
  },
  {
    layoutId: "sidebar",
    name: "Sidebar",
    tag: "Structured",
    category: "creative",
    description: "Dark sidebar with two-column structure - striking and scannable.",
    isPremium: true,
    accent: "#1E293B",
    palette: { bg: "#ffffff", primary: "#1E293B", secondary: "#94A3B8" },
    bodyFont: "Nunito Sans, sans-serif",
  },
];

async function resolveSeedUserId(): Promise<string> {
  const preferredId = process.env.TEMPLATE_SEED_USER_ID;
  if (preferredId && mongoose.isValidObjectId(preferredId)) {
    const user = await User.findById(preferredId).select("_id").lean();
    if (user) return String(user._id);
  }

  const admin = await User.findOne({ role: UserRole.ADMIN }).select("_id").lean();
  if (admin) return String(admin._id);

  const anyUser = await User.findOne().select("_id").lean();
  if (anyUser) return String(anyUser._id);

  const seededUser = await User.create({
    name: "Template Seeder",
    email: `template-seeder-${Date.now()}@local.seed`,
    role: UserRole.ADMIN,
    authProvider: "google",
    googleId: `template-seeder-${Date.now()}`,
  });

  return String(seededUser._id);
}

function toTemplateDoc(seed: SeedTemplate, sortOrder: number, adminId: string) {
  return {
    layoutId: seed.layoutId,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    tag: seed.tag,
    isPremium: seed.isPremium,
    sortOrder,
    thumbnailUrl: "",
    cssVars: {
      accentColor: seed.accent,
      headingColor: seed.palette.primary,
      textColor: seed.palette.secondary,
      mutedColor: seed.palette.secondary,
      borderColor: "#d9d9d9",
      backgroundColor: seed.palette.bg,
      bodyFont: seed.bodyFont,
      headingFont: seed.bodyFont,
      fontSize: "10.5pt",
      lineHeight: "1.5",
    },
    slots: {
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: false,
      certifications: false,
      languages: false,
    },
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: adminId,
    updatedBy: adminId,
  };
}

async function seedTemplates() {
  await connectDB();

  const adminId = await resolveSeedUserId();
  let created = 0;
  let updated = 0;

  for (const [index, seed] of SEED_TEMPLATES.entries()) {
    const doc = toTemplateDoc(seed, index, adminId);
    const existing = await Template.findOne({ layoutId: seed.layoutId }).sort({ createdAt: 1 }).lean();

    if (existing) {
      await Template.findByIdAndUpdate(
        String(existing._id),
        {
          ...doc,
          updatedBy: adminId,
        },
        { runValidators: true },
      );
      updated += 1;
      continue;
    }

    await Template.create(doc);
    created += 1;
  }

  console.log(`Template seeding complete. Created: ${created}, Updated: ${updated}, Total Seed Set: ${SEED_TEMPLATES.length}`);
}

seedTemplates()
  .catch((error) => {
    console.error("Failed to seed templates:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
