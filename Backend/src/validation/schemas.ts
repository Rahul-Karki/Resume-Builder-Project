import { z } from "zod";
import { sanitizePlainText } from "../utils/sanitize";

const objectIdRegex = /^[a-f\d]{24}$/i;
const layoutIdRegex = /^[a-z0-9_-]+$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

const plainText = (maxLength: number) => z.string().trim().max(maxLength).transform((value) => String(sanitizePlainText(value)));

const emailSchema = z.email().max(254).transform((value) => value.trim().toLowerCase());

const emptyObjectSchema = z.object({}).strict();

const objectIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid id format"),
}).strict();

const authSignupSchema = z.object({
  name: plainText(120).pipe(z.string().min(1).max(120)),
  email: emailSchema,
  password: z.string().regex(strongPasswordRegex, "Password must include uppercase, lowercase, special character and be at least 8 characters"),
}).strict();

const authLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
}).strict();

const authEmailSchema = z.object({
  email: emailSchema,
}).strict();

const authResetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(256),
  password: z.string().regex(strongPasswordRegex, "Password must include uppercase, lowercase, special character and be at least 8 characters"),
  confirmPassword: z.string().min(8),
}).strict().refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

const googleLoginSchema = z.object({
  token: z.string().trim().min(20),
}).strict();

const oauthLinkSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(1),
}).strict();

const oauthUnlinkSchema = z.object({
  provider: z.enum(["google", "local"]),
  password: z.string().min(1),
}).strict();

const templateCategorySchema = z.enum(["tech", "non-tech"]);
const templateAudienceSchema = z.enum(["tech", "non-tech"]);
const templateStatusSchema = z.enum(["draft", "published", "archived"]);

const cssVarsSchema = z.object({
  accentColor: z.string().trim().max(30).optional(),
  headingColor: z.string().trim().max(30).optional(),
  textColor: z.string().trim().max(30).optional(),
  mutedColor: z.string().trim().max(30).optional(),
  borderColor: z.string().trim().max(30).optional(),
  backgroundColor: z.string().trim().max(30).optional(),
  bodyFont: z.string().trim().max(120).optional(),
  headingFont: z.string().trim().max(120).optional(),
  fontSize: z.string().trim().max(20).optional(),
  lineHeight: z.string().trim().max(20).optional(),
}).strict();

const slotsSchema = z.object({
  summary: z.boolean().optional(),
  experience: z.boolean().optional(),
  education: z.boolean().optional(),
  skills: z.boolean().optional(),
  projects: z.boolean().optional(),
  certifications: z.boolean().optional(),
  languages: z.boolean().optional(),
}).strict();

const createTemplateSchema = z.object({
  layoutId: z.string().regex(layoutIdRegex, "layoutId must contain lowercase letters, numbers, hyphen or underscore").max(80),
  name: plainText(60).pipe(z.string().min(1).max(60)),
  description: plainText(300).optional(),
  category: templateCategorySchema.optional(),
  audience: templateAudienceSchema.optional(),
  tag: plainText(30).optional(),
  tags: z.array(plainText(30).pipe(z.string().min(1).max(30))).max(12).optional(),
  isPremium: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(5000).optional(),
  cssVars: cssVarsSchema.optional(),
  slots: slotsSchema.optional(),
  thumbnailUrl: z.string().trim().max(2048).optional(),
}).strict();

const updateTemplateSchema = createTemplateSchema.partial().strict().extend({
  status: templateStatusSchema.optional(),
});

const reorderTemplatesSchema = z.object({
  orderedIds: z.array(z.string().regex(objectIdRegex, "Invalid template id")).min(1).max(200),
}).strict();

const setTemplateStatusSchema = z.object({
  status: templateStatusSchema,
}).strict();

const templateListQuerySchema = z.object({
  status: templateStatusSchema.optional(),
  category: templateCategorySchema.optional(),
  audience: templateAudienceSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(30)).optional(),
}).strict();

const publicTemplateListQuerySchema = z.object({
  category: templateCategorySchema.optional(),
  audience: templateAudienceSchema.optional(),
}).strict();

const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
}).strict();

const usageSchema = z.object({
  templateId: z.string().regex(objectIdRegex, "Invalid templateId").optional(),
  layoutId: z.string().regex(layoutIdRegex, "Invalid layoutId").max(80),
  type: z.enum(["create", "edit"]).optional(),
}).strict();

const exportPresetSchema = z.object({
  preset: z.enum(["web", "standard", "print"]).optional(),
}).strict();

const safeExportPdfSchema = z.object({
  html: z.string().min(200).max(600000),
  title: z.string().trim().min(1).max(160).optional(),
  preset: z.enum(["web", "standard", "print"]).optional(),
}).strict();

const resumeEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  company: plainText(160).optional(),
  role: plainText(160).optional(),
  start: plainText(50).optional(),
  end: plainText(50).optional(),
  location: plainText(120).optional(),
  current: z.boolean().optional(),
  contentMode: z.enum(["bullets", "paragraph"]).optional(),
  description: plainText(1200).optional(),
  bullets: z.array(plainText(300)).optional(),
}).strict();

const educationEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  institution: plainText(180).optional(),
  degree: plainText(160).optional(),
  field: plainText(160).optional(),
  year: plainText(20).optional(),
  cgpa: plainText(20).optional(),
}).strict();

const skillEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  category: plainText(120).optional(),
  items: z.array(plainText(100)).optional(),
}).strict();

const projectEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: plainText(180).optional(),
  contentMode: z.enum(["bullets", "paragraph"]).optional(),
  description: plainText(500).optional(),
  bullets: z.array(plainText(300)).optional(),
  tech: plainText(240).optional(),
  link: z.string().max(2048).optional(),
}).strict();

const certificationEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: plainText(180).optional(),
  issuer: plainText(180).optional(),
  year: plainText(20).optional(),
}).strict();

const languageEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  language: plainText(80).optional(),
  proficiency: z.enum(["Native", "Fluent", "Advanced", "Intermediate", "Basic"]).optional(),
}).strict();

const resumeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  templateId: z.string().trim().min(1).max(120),
  personalInfo: z.object({
    name: plainText(120).optional(),
    title: plainText(120).optional(),
    email: z.string().max(254).optional(),
    phone: plainText(50).optional(),
    location: plainText(120).optional(),
    linkedin: z.string().max(2048).optional(),
    github: z.string().max(2048).optional(),
    portfolio: z.string().max(2048).optional(),
    summary: plainText(2000).optional(),
  }).strict().optional(),
  sections: z.object({
    experience: z.array(resumeEntrySchema).optional(),
    education: z.array(educationEntrySchema).optional(),
    skills: z.array(skillEntrySchema).optional(),
    projects: z.array(projectEntrySchema).optional(),
    certifications: z.array(certificationEntrySchema).optional(),
    languages: z.array(languageEntrySchema).optional(),
  }).strict().optional(),
  style: z.object({
    accentColor: z.string().max(30).optional(),
    headingColor: z.string().max(30).optional(),
    textColor: z.string().max(30).optional(),
    mutedColor: z.string().max(30).optional(),
    borderColor: z.string().max(30).optional(),
    backgroundColor: z.string().max(30).optional(),
    bodyFont: plainText(120).optional(),
    headingFont: plainText(120).optional(),
    fontSize: z.enum(["9pt", "9.5pt", "10pt", "10.5pt", "11pt", "11.5pt"]).optional(),
    lineHeight: z.enum(["1.3", "1.4", "1.5", "1.6", "1.7"]).optional(),
    pageMargin: z.enum(["tight", "normal", "relaxed", "spacious"]).optional(),
    sectionSpacing: z.enum(["compact", "normal", "loose"]).optional(),
    showDividers: z.boolean().optional(),
    bulletStyle: z.enum(["•", "–", "›", "▸", "◦"]).optional(),
    headerAlign: z.enum(["left", "center"]).optional(),
  }).strict().optional(),
  sectionOrder: z.array(z.enum(["experience", "education", "skills", "projects", "certifications", "languages"])).optional(),
  sectionVisibility: z.object({
    experience: z.boolean().optional(),
    education: z.boolean().optional(),
    skills: z.boolean().optional(),
    projects: z.boolean().optional(),
    certifications: z.boolean().optional(),
    languages: z.boolean().optional(),
  }).strict().optional(),
}).strict();

const createResumeSchema = resumeSchema;
const updateResumeSchema = resumeSchema.partial().strict();

export {
  analyticsQuerySchema,
  authEmailSchema,
  authLoginSchema,
  authResetPasswordSchema,
  authSignupSchema,
  createResumeSchema,
  createTemplateSchema,
  emptyObjectSchema,
  exportPresetSchema,
  googleLoginSchema,
  oauthLinkSchema,
  oauthUnlinkSchema,
  objectIdParamSchema,
  publicTemplateListQuerySchema,
  reorderTemplatesSchema,
  safeExportPdfSchema,
  setTemplateStatusSchema,
  templateListQuerySchema,
  updateResumeSchema,
  updateTemplateSchema,
  usageSchema,
};
