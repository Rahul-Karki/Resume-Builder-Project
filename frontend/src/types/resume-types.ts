// ─── Core Data Types ───────────────────────────────────────────────────────────

export interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  summary: string;
}

export interface WorkEntry {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  current: boolean;
  bullets: string[];
}

export interface EduEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  cgpa: string;
}

export interface SkillGroup {
  id: string;
  category: string;
  items: string[]; // comma-separated tags
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tech: string;
  link: string;
}

export interface CertEntry {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: "Native" | "Fluent" | "Advanced" | "Intermediate" | "Basic";
}

export interface ResumeSections {
  experience: WorkEntry[];
  education: EduEntry[];
  skills: SkillGroup[];
  projects: Project[];
  certifications: CertEntry[];
  languages: LanguageEntry[];
}

// ─── Style Customization ───────────────────────────────────────────────────────

export type FontFamily =
  | "EB Garamond, serif"
  | "Playfair Display, serif"
  | "Lora, serif"
  | "DM Sans, sans-serif"
  | "IBM Plex Sans, sans-serif"
  | "Nunito Sans, sans-serif"
  | "Outfit, sans-serif"
  | "Source Serif 4, serif";

export type FontSize = "9pt" | "9.5pt" | "10pt" | "10.5pt" | "11pt" | "11.5pt";

export type LineHeight = "1.3" | "1.4" | "1.5" | "1.6" | "1.7";

export type PageMargin = "tight" | "normal" | "relaxed" | "spacious";

export type SectionSpacing = "compact" | "normal" | "loose";

export interface ResumeStyle {
  accentColor: string;
  headingColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  bodyFont: FontFamily;
  headingFont: FontFamily;
  fontSize: FontSize;
  lineHeight: LineHeight;
  pageMargin: PageMargin;
  sectionSpacing: SectionSpacing;
  showDividers: boolean;
  bulletStyle: "•" | "–" | "›" | "▸" | "◦";
  headerAlign: "left" | "center";
}

// ─── Section Visibility ────────────────────────────────────────────────────────

export interface SectionVisibility {
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  languages: boolean;
}

// ─── Full Resume Document ──────────────────────────────────────────────────────

export interface ResumeDocument {
  _id?: string;
  id?: string;
  baseResumeId?: string;
  isVariant?: boolean;
  variantLabel?: string;
  targetRole?: string;
  title: string;
  templateId: string;
  personalInfo: PersonalInfo;
  sections: ResumeSections;
  style: ResumeStyle;
  sectionOrder: Array<keyof ResumeSections>;
  sectionVisibility: SectionVisibility;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Builder UI State ──────────────────────────────────────────────────────────

export type EditorTab = "content" | "style" | "sections";
export type ActiveSection =
  | "personal"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages";

export type PreviewScale = 0.5 | 0.6 | 0.7 | 0.75 | 0.85 | 1;
export type ExportPreset = "web" | "standard" | "print";

export interface AtsSuggestion {
  id: string;
  path: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  impact: "low" | "medium" | "high";
}

export interface AtsAnalysis {
  _id: string;
  scoreOverall: number;
  sectionScores: {
    summary: number;
    experience: number;
    skills: number;
    education: number;
    formatting: number;
  };
  missingKeywords: string[];
  rewriteSuggestions: AtsSuggestion[];
  updatedAt: string;
}

export interface ResumeVersionMeta {
  _id: string;
  versionNo: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  snapshot?: {
    title?: string;
  };
}

export interface BuilderUIState {
  activeTab: EditorTab;
  activeSection: ActiveSection;
  previewScale: PreviewScale;
  exportPreset: ExportPreset;
  isSaving: boolean;
  isSaved: boolean;
  isDirty: boolean;
  saveError: string | null;
}

// ─── Default Values ────────────────────────────────────────────────────────────

export const defaultStyle: ResumeStyle = {
  accentColor: "#1a1a1a",
  headingColor: "#111111",
  textColor: "#333333",
  mutedColor: "#666666",
  borderColor: "#cccccc",
  backgroundColor: "#ffffff",
  bodyFont: "EB Garamond, serif",
  headingFont: "EB Garamond, serif",
  fontSize: "10.5pt",
  lineHeight: "1.5",
  pageMargin: "normal",
  sectionSpacing: "normal",
  showDividers: true,
  bulletStyle: "•",
  headerAlign: "left",
};

export const defaultPersonalInfo: PersonalInfo = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  summary: "",
};

export const defaultResumeSections: ResumeSections = {
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
};

export const defaultSectionVisibility: SectionVisibility = {
  experience: true,
  education: true,
  skills: true,
  projects: true,
  certifications: true,
  languages: false,
};

export const defaultSectionOrder: Array<keyof ResumeSections> = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
];

export const fontOptions: { label: string; value: FontFamily }[] = [
  { label: "EB Garamond",       value: "EB Garamond, serif" },
  { label: "Playfair Display",  value: "Playfair Display, serif" },
  { label: "Lora",              value: "Lora, serif" },
  { label: "Source Serif 4",    value: "Source Serif 4, serif" },
  { label: "DM Sans",           value: "DM Sans, sans-serif" },
  { label: "IBM Plex Sans",     value: "IBM Plex Sans, sans-serif" },
  { label: "Nunito Sans",       value: "Nunito Sans, sans-serif" },
  { label: "Outfit",            value: "Outfit, sans-serif" },
];

export const marginMap: Record<PageMargin, string> = {
  tight:    "28px 32px",
  normal:   "40px 48px",
  relaxed:  "52px 60px",
  spacious: "64px 72px",
};

export const spacingMap: Record<SectionSpacing, number> = {
  compact: 12,
  normal:  20,
  loose:   32,
};

export type TemplateId = "classic" | "executive" | "modern" | "compact" | "sidebar";

export interface SavedResume {
  id: string; title: string; templateId: string;
  updatedAt: string; createdAt: string; completionScore: number;
  personalInfo: { name: string; title: string; email: string; location: string; };
  sectionCounts: { experience: number; education: number; skills: number; projects: number; certifications: number; };
}

export interface TemplateMeta {
  id: TemplateId; name: string; tag: string; category: string;
  description: string; isPremium: boolean; accent: string;
  palette: { bg: string; primary: string; secondary: string; sidebar?: string; };
}
export type SortOption = "updatedAt" | "createdAt" | "title" | "completion";
export interface User { id: string; name: string; email: string; avatar: string; plan: "free" | "pro"; }