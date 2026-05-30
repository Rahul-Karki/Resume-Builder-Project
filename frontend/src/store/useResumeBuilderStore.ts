import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  ResumeDocument, BuilderUIState, PersonalInfo, ResumeStyle,
  WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry,
  ActiveSection, EditorTab, ExportPreset, PreviewScale, SectionVisibility, FocusedEditorField,
  defaultStyle, defaultPersonalInfo, defaultResumeSections,
  defaultSectionVisibility, defaultSectionOrder,
} from "@/types/resume-types";
import { api } from "@/services/api";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";
import { templates as localTemplateCatalog } from "@/data/templateMeta";

// ─── Helper: generate IDs ──────────────────────────────────────────────────────
const uid = () => window.crypto.randomUUID().slice(0, 8);

const hasResumeContent = (resume: ResumeDocument) => {
  const p = resume.personalInfo;
  const s = resume.sections;

  const personalFields = [
    p.name, p.title, p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio, p.summary,
  ];

  return personalFields.some(value => value.trim().length > 0)
    || s.experience.some(entry => [entry.company, entry.role, entry.start, entry.end, entry.location, entry.description, ...entry.bullets].some(value => value.trim().length > 0))
    || s.education.some(entry => [entry.institution, entry.degree, entry.field, entry.year, entry.cgpa].some(value => value.trim().length > 0))
    || s.skills.some(group => group.category.trim().length > 0 || group.items.some(item => item.trim().length > 0))
    || s.projects.some(entry => [entry.name, entry.description, entry.tech, entry.link, ...entry.bullets].some(value => value.trim().length > 0))
    || s.certifications.some(entry => [entry.name, entry.issuer, entry.year].some(value => value.trim().length > 0))
    || s.languages.some(entry => entry.language.trim().length > 0 || entry.proficiency.trim().length > 0);
};

const toResumePayload = (resume: ResumeDocument) => ({
  title: resume.title,
  templateId: normalizeResumeTemplateId(resume.templateId),
  personalInfo: {
    name: resume.personalInfo.name,
    title: resume.personalInfo.title,
    email: resume.personalInfo.email,
    phone: resume.personalInfo.phone,
    location: resume.personalInfo.location,
    linkedin: resume.personalInfo.linkedin,
    github: resume.personalInfo.github,
    portfolio: resume.personalInfo.portfolio,
    summary: resume.personalInfo.summary,
  },
  sections: {
    experience: resume.sections.experience.map((entry) => ({
      id: entry.id,
      company: entry.company,
      role: entry.role,
      start: entry.start,
      end: entry.end,
      location: entry.location,
      current: entry.current,
      contentMode: entry.contentMode,
      description: entry.description,
      bullets: [...entry.bullets],
    })),
    education: resume.sections.education.map((entry) => ({
      id: entry.id,
      institution: entry.institution,
      degree: entry.degree,
      field: entry.field,
      year: entry.year,
      cgpa: entry.cgpa,
    })),
    skills: resume.sections.skills.map((entry) => ({
      id: entry.id,
      category: entry.category,
      items: [...entry.items],
    })),
    projects: resume.sections.projects.map((entry) => ({
      id: entry.id,
      name: entry.name,
      contentMode: entry.contentMode,
      description: entry.description,
      bullets: [...entry.bullets],
      tech: entry.tech,
      link: entry.link,
    })),
    certifications: resume.sections.certifications.map((entry) => ({
      id: entry.id,
      name: entry.name,
      issuer: entry.issuer,
      year: entry.year,
    })),
    languages: resume.sections.languages.map((entry) => ({
      id: entry.id,
      language: entry.language,
      proficiency: entry.proficiency,
    })),
  },
  style: {
    accentColor: resume.style.accentColor,
    headingColor: resume.style.headingColor,
    textColor: resume.style.textColor,
    mutedColor: resume.style.mutedColor,
    borderColor: resume.style.borderColor,
    backgroundColor: resume.style.backgroundColor,
    bodyFont: resume.style.bodyFont,
    headingFont: resume.style.headingFont,
    fontSize: resume.style.fontSize,
    lineHeight: resume.style.lineHeight,
    pageMargin: resume.style.pageMargin,
    sectionSpacing: resume.style.sectionSpacing,
    showDividers: resume.style.showDividers,
    bulletStyle: resume.style.bulletStyle,
    headerAlign: resume.style.headerAlign,
  },
  sectionOrder: [...resume.sectionOrder],
  sectionVisibility: {
    experience: resume.sectionVisibility.experience,
    education: resume.sectionVisibility.education,
    skills: resume.sectionVisibility.skills,
    projects: resume.sectionVisibility.projects,
    certifications: resume.sectionVisibility.certifications,
    languages: resume.sectionVisibility.languages,
  },
});

// ─── Store Shape ───────────────────────────────────────────────────────────────
interface ResumeBuilderStore {
  // Document state
  resume: ResumeDocument;
  // UI state
  ui: BuilderUIState;

  // ── Personal info ──────────────────────────────────────────────────────────
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;

  // ── Style ──────────────────────────────────────────────────────────────────
  updateStyle: (field: keyof ResumeStyle, value: string | boolean) => void;
  resetStyle: () => void;

  // ── Experience ─────────────────────────────────────────────────────────────
  addExperience: () => void;
  updateExperience: (id: string, field: keyof WorkEntry, value: string | boolean | string[]) => void;
  removeExperience: (id: string) => void;
  addBullet: (expId: string) => void;
  updateBullet: (expId: string, index: number, value: string) => void;
  removeBullet: (expId: string, index: number) => void;
  reorderExperience: (fromIdx: number, toIdx: number) => void;

  // ── Education ──────────────────────────────────────────────────────────────
  addEducation: () => void;
  updateEducation: (id: string, field: keyof EduEntry, value: string) => void;
  removeEducation: (id: string) => void;

  // ── Skills ─────────────────────────────────────────────────────────────────
  addSkillGroup: () => void;
  updateSkillGroup: (id: string, field: keyof SkillGroup, value: string | string[]) => void;
  removeSkillGroup: (id: string) => void;

  // ── Projects ───────────────────────────────────────────────────────────────
  addProject: () => void;
  updateProject: (id: string, field: keyof Project, value: string) => void;
  addProjectBullet: (projectId: string) => void;
  updateProjectBullet: (projectId: string, index: number, value: string) => void;
  removeProjectBullet: (projectId: string, index: number) => void;
  removeProject: (id: string) => void;

  // ── Certifications ─────────────────────────────────────────────────────────
  addCertification: () => void;
  updateCertification: (id: string, field: keyof CertEntry, value: string) => void;
  removeCertification: (id: string) => void;

  // ── Languages ──────────────────────────────────────────────────────────────
  addLanguage: () => void;
  updateLanguage: (id: string, field: keyof LanguageEntry, value: string) => void;
  removeLanguage: (id: string) => void;

  // ── Sections management ────────────────────────────────────────────────────
  toggleSectionVisibility: (section: keyof SectionVisibility) => void;
  reorderSections: (fromIdx: number, toIdx: number) => void;
  setTitle: (title: string) => void;

  // ── UI controls ────────────────────────────────────────────────────────────
  setActiveTab: (tab: EditorTab) => void;
  setActiveSection: (section: ActiveSection) => void;
  setFocusedField: (field: FocusedEditorField | null) => void;
  setPreviewScale: (scale: PreviewScale) => void;
  setExportPreset: (preset: ExportPreset) => void;

  // ── Persistence ────────────────────────────────────────────────────────────
  saveResume: () => Promise<void>;
  loadResume: (id: string, preloadedResume?: ResumeDocument) => Promise<void>;
  initFromTemplate: (templateId: string) => Promise<void>;
  applyTemplateUpgrade: (templateId: string) => Promise<void>;
  markDirty: () => void;
}

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialResume: ResumeDocument = {
  title: "Untitled Resume",
  templateId: "classic",
  personalInfo: { ...defaultPersonalInfo },
  sections: { ...defaultResumeSections },
  style: { ...defaultStyle },
  sectionOrder: [...defaultSectionOrder],
  sectionVisibility: { ...defaultSectionVisibility },
};

const initialUI: BuilderUIState = {
  activeTab: "content",
  activeSection: "personal",
  focusedField: null,
  previewScale: 0.5,
  exportPreset: "standard",
  isSaving: false,
  isSaved: false,
  isDirty: false,
  saveError: null,
};

const VALID_FONTS = new Set([
  "EB Garamond, serif",
  "Playfair Display, serif",
  "Lora, serif",
  "DM Sans, sans-serif",
  "IBM Plex Sans, sans-serif",
  "Nunito Sans, sans-serif",
  "Outfit, sans-serif",
  "Source Serif 4, serif",
]);

const VALID_FONT_SIZES = new Set(["9pt", "9.5pt", "10pt", "10.5pt", "11pt", "11.5pt"]);
const VALID_LINE_HEIGHTS = new Set(["1.3", "1.4", "1.5", "1.6", "1.7"]);

const safeFont = (value: unknown, fallback: ResumeStyle["bodyFont"]): ResumeStyle["bodyFont"] => {
  if (typeof value === "string" && VALID_FONTS.has(value)) {
    return value as ResumeStyle["bodyFont"];
  }
  return fallback;
};

const safeFontSize = (value: unknown, fallback: ResumeStyle["fontSize"]): ResumeStyle["fontSize"] => {
  if (typeof value === "string" && VALID_FONT_SIZES.has(value)) {
    return value as ResumeStyle["fontSize"];
  }
  return fallback;
};

const safeLineHeight = (value: unknown, fallback: ResumeStyle["lineHeight"]): ResumeStyle["lineHeight"] => {
  if (typeof value === "string" && VALID_LINE_HEIGHTS.has(value)) {
    return value as ResumeStyle["lineHeight"];
  }
  return fallback;
};

const TEMPLATE_STYLE_PRESETS: Record<string, Partial<typeof defaultStyle>> = {
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

const TEMPLATE_SECTION_VISIBILITY_PRESETS: Record<string, typeof defaultSectionVisibility> = {
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

const resolveTemplateCategory = (templateId: string, apiCategory?: string) => {
  if (apiCategory === "tech" || apiCategory === "non-tech") {
    return apiCategory;
  }

  const localTemplate = localTemplateCatalog.find((template) => template.id === templateId);
  return localTemplate?.category ?? "non-tech";
};

const SECTION_KEYS: Array<keyof SectionVisibility> = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
];

const getTemplateBaseStyle = (templateId: string) => ({
  ...defaultStyle,
  ...(TEMPLATE_STYLE_PRESETS[templateId] ?? {}),
});

const getTemplateBaseVisibility = (templateId: string) => ({
  ...(TEMPLATE_SECTION_VISIBILITY_PRESETS[templateId] ?? defaultSectionVisibility),
});

const resolveTemplateStyle = (templateId: string) => getTemplateBaseStyle(templateId);
const resolveTemplateVisibility = (templateId: string) => getTemplateBaseVisibility(templateId);

const resolveTemplateConfig = (templateId: string) => {
  const normalizedTemplateId = normalizeResumeTemplateId(templateId);
  const baseStyle = resolveTemplateStyle(normalizedTemplateId);
  const baseVisibility = resolveTemplateVisibility(normalizedTemplateId);

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

const sectionHasContent = (resume: ResumeDocument, section: keyof SectionVisibility) => {
  const value = resume.sections[section];
  return Array.isArray(value) && value.length > 0;
};

const mergeTemplateVisibilityForExistingResume = (
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

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useResumeBuilderStore = create<ResumeBuilderStore>()(
  subscribeWithSelector(immer((set, get) => ({
    resume: initialResume,
    ui: initialUI,

    markDirty: () => set((state) => { state.ui.isDirty = true; state.ui.isSaved = false; }),

    // ─── Personal Info ───────────────────────────────────────────────────────
    updatePersonalInfo: (field, value) =>
      set((state) => {
        state.resume.personalInfo[field] = value;
        state.ui.isDirty = true;
        state.ui.isSaved = false;
      }),

    // ─── Style ──────────────────────────────────────────────────────────────
    updateStyle: (field: keyof ResumeStyle, value: string | boolean) =>
      set((state) => {
        (state.resume.style as Record<string, string | boolean>)[field] = value;
        state.ui.isDirty = true;
        state.ui.isSaved = false;
      }),

    resetStyle: () =>
      set((state) => {
        state.resume.style = { ...getTemplateBaseStyle(normalizeResumeTemplateId(state.resume.templateId)) };
        state.ui.isDirty = true;
        state.ui.isSaved = false;
      }),

    // ─── Experience ──────────────────────────────────────────────────────────
    addExperience: () =>
      set((state) => {
        const newEntry: WorkEntry = {
          id: uid(), company: "", role: "", start: "", end: "",
          location: "", current: false, contentMode: "bullets", description: "", bullets: [""],
        };
        state.resume.sections.experience.push(newEntry);
        state.resume.sectionVisibility.experience = true;
        state.ui.isDirty = true;
        state.ui.activeSection = "experience";
      }),

    updateExperience: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.experience.find(e => e.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
        state.ui.isSaved = false;
      }),

    removeExperience: (id) =>
      set((state) => {
        state.resume.sections.experience = state.resume.sections.experience.filter(e => e.id !== id);
        if (state.resume.sections.experience.length === 0) {
          state.resume.sectionVisibility.experience = false;
        }
        state.ui.isDirty = true;
      }),

    addBullet: (expId) =>
      set((state) => {
        const entry = state.resume.sections.experience.find(e => e.id === expId);
        if (entry) entry.bullets.push("");
        state.ui.isDirty = true;
      }),

    updateBullet: (expId, index, value) =>
      set((state) => {
        const entry = state.resume.sections.experience.find(e => e.id === expId);
        if (entry && index >= 0 && index < entry.bullets.length) {
          entry.bullets[index] = value;
        }
        state.ui.isDirty = true;
      }),

    removeBullet: (expId, index) =>
      set((state) => {
        const entry = state.resume.sections.experience.find(e => e.id === expId);
        if (entry) {
          entry.bullets = entry.bullets.filter((_, i) => i !== index);
        }
        state.ui.isDirty = true;
      }),

    reorderExperience: (fromIdx, toIdx) =>
      set((state) => {
        const arr = state.resume.sections.experience;
        if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
      }),

    // ─── Education ───────────────────────────────────────────────────────────
    addEducation: () =>
      set((state) => {
        state.resume.sections.education.push({ id: uid(), institution: "", degree: "", field: "", year: "", cgpa: "" });
        state.resume.sectionVisibility.education = true;
        state.ui.isDirty = true;
        state.ui.activeSection = "education";
      }),

    updateEducation: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.education.find(e => e.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
      }),

    removeEducation: (id) =>
      set((state) => {
        state.resume.sections.education = state.resume.sections.education.filter(e => e.id !== id);
        if (state.resume.sections.education.length === 0) {
          state.resume.sectionVisibility.education = false;
        }
        state.ui.isDirty = true;
      }),

    // ─── Skills ──────────────────────────────────────────────────────────────
    addSkillGroup: () =>
      set((state) => {
        state.resume.sections.skills.push({ id: uid(), category: "Skills", items: [] });
        state.resume.sectionVisibility.skills = true;
        state.ui.isDirty = true;
        state.ui.activeSection = "skills";
      }),

    updateSkillGroup: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.skills.find(sk => sk.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
      }),

    removeSkillGroup: (id) =>
      set((state) => {
        state.resume.sections.skills = state.resume.sections.skills.filter(sk => sk.id !== id);
        if (state.resume.sections.skills.length === 0) {
          state.resume.sectionVisibility.skills = false;
        }
        state.ui.isDirty = true;
      }),

    // ─── Projects ────────────────────────────────────────────────────────────
    addProject: () =>
      set((state) => {
        state.resume.sections.projects.push({ id: uid(), name: "", contentMode: "paragraph", description: "", bullets: [""], tech: "", link: "" });
        state.resume.sectionVisibility.projects = true;
        state.ui.isDirty = true;
        state.ui.activeSection = "projects";
      }),

    updateProject: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.projects.find(p => p.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
      }),

    addProjectBullet: (projectId) =>
      set((state) => {
        const entry = state.resume.sections.projects.find(p => p.id === projectId);
        if (entry) entry.bullets.push("");
        state.ui.isDirty = true;
      }),

    updateProjectBullet: (projectId, index, value) =>
      set((state) => {
        const entry = state.resume.sections.projects.find(p => p.id === projectId);
        if (entry && index >= 0 && index < entry.bullets.length) {
          entry.bullets[index] = value;
        }
        state.ui.isDirty = true;
      }),

    removeProjectBullet: (projectId, index) =>
      set((state) => {
        const entry = state.resume.sections.projects.find(p => p.id === projectId);
        if (entry) {
          entry.bullets = entry.bullets.filter((_, i) => i !== index);
        }
        state.ui.isDirty = true;
      }),

    removeProject: (id) =>
      set((state) => {
        state.resume.sections.projects = state.resume.sections.projects.filter(p => p.id !== id);
        if (state.resume.sections.projects.length === 0) {
          state.resume.sectionVisibility.projects = false;
        }
        state.ui.isDirty = true;
      }),

    // ─── Certifications ──────────────────────────────────────────────────────
    addCertification: () =>
      set((state) => {
        state.resume.sections.certifications.push({ id: uid(), name: "", issuer: "", year: "", url: "" });
        state.resume.sectionVisibility.certifications = true;
        state.ui.isDirty = true;
      }),

    updateCertification: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.certifications.find(c => c.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
      }),

    removeCertification: (id) =>
      set((state) => {
        state.resume.sections.certifications = state.resume.sections.certifications.filter(c => c.id !== id);
        if (state.resume.sections.certifications.length === 0) {
          state.resume.sectionVisibility.certifications = false;
        }
        state.ui.isDirty = true;
      }),

    // ─── Languages ───────────────────────────────────────────────────────────
    addLanguage: () =>
      set((state) => {
        state.resume.sections.languages.push({ id: uid(), language: "", proficiency: "Fluent" });
        state.resume.sectionVisibility.languages = true;
        state.ui.isDirty = true;
      }),

    updateLanguage: (id, field, value) =>
      set((state) => {
        const entry = state.resume.sections.languages.find(l => l.id === id);
        if (entry) {
          (entry as Record<string, unknown>)[field] = value;
        }
        state.ui.isDirty = true;
      }),

    removeLanguage: (id) =>
      set((state) => {
        state.resume.sections.languages = state.resume.sections.languages.filter(l => l.id !== id);
        if (state.resume.sections.languages.length === 0) {
          state.resume.sectionVisibility.languages = false;
        }
        state.ui.isDirty = true;
      }),

    // ─── Sections Management ─────────────────────────────────────────────────
    toggleSectionVisibility: (section) =>
      set((state) => {
        state.resume.sectionVisibility[section] = !state.resume.sectionVisibility[section];
        state.ui.isDirty = true;
      }),

    reorderSections: (fromIdx, toIdx) =>
      set((state) => {
        const arr = state.resume.sectionOrder;
        if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
      }),

    setTitle: (title) =>
      set((state) => { state.resume.title = title; state.ui.isDirty = true; }),

    // ─── UI Controls ─────────────────────────────────────────────────────────
    setActiveTab: (tab) => set((state) => { state.ui.activeTab = tab; }),
    setActiveSection: (section) => set((state) => { state.ui.activeSection = section; }),
    setFocusedField: (field) => set((state) => { state.ui.focusedField = field; }),
    setPreviewScale: (scale) => set((state) => { state.ui.previewScale = scale; }),
    setExportPreset: (preset) => set((state) => { state.ui.exportPreset = preset; }),

    // ─── Init from template ───────────────────────────────────────────────────
    initFromTemplate: async (templateId) => {
      const resolvedTemplate = await resolveTemplateConfig(templateId);

      set(() => ({
        resume: {
          ...initialResume,
          templateId: resolvedTemplate.templateId,
          templateCategory: resolvedTemplate.templateCategory,
          style: resolvedTemplate.style,
          sectionVisibility: resolvedTemplate.sectionVisibility,
          sectionOrder: [...defaultSectionOrder],
        },
        ui: {
          ...initialUI,
        },
      }));
    },

    applyTemplateUpgrade: async (templateId) => {
      const resolvedTemplate = await resolveTemplateConfig(templateId);
      const currentResume = get().resume;

      set((s) => ({
        resume: {
          ...s.resume,
          templateId: resolvedTemplate.templateId,
          templateCategory: resolvedTemplate.templateCategory,
          style: resolvedTemplate.style,
          sectionVisibility: mergeTemplateVisibilityForExistingResume(currentResume, resolvedTemplate.sectionVisibility),
        },
        ui: {
          ...s.ui,
          isDirty: true,
          isSaved: false,
          saveError: null,
        },
      }));
    },

    // ─── Save with optimistic updates ─────────────────────────────────────────
    saveResume: async () => {
      const { resume } = get();
      const previousResume = { ...resume };
      const timestamp = new Date().toISOString();

      // Optimistic update: immediately reflect saving state
      set(s => ({
        ui: { ...s.ui, isSaving: true, isSaved: false, saveError: null },
      }));

      try {
        const payload = toResumePayload(resume);
        const hasServerId = !!(resume.id && !resume.id.startsWith('res_'));
        const response = hasServerId
          ? await api.put(`/resumes/${resume.id}`, payload)
          : await api.post(`/resumes`, payload);

        const savedResume = response.data?.resume ?? response.data;
        const savedId = savedResume?._id ?? savedResume?.id;
        if (!savedId) throw new Error('Server did not return a resume ID');

        set(s => ({
          resume: { ...s.resume, id: savedId, updatedAt: savedResume?.updatedAt ?? timestamp },
          ui: { ...s.ui, isSaving: false, isSaved: true, isDirty: false },
        }));
      } catch (err) {
        // Rollback: restore previous state on failure
        set({
          resume: previousResume,
          ui: { ...get().ui, isSaving: false, saveError: "Failed to save. Your changes have been preserved locally." },
        });
      }
    },

    // ─── Load ────────────────────────────────────────────────────────────────
    loadResume: async (id, preloadedResume) => {
      if (preloadedResume) {
        set(s => ({
          resume: {
            ...initialResume,
            ...preloadedResume,
            templateId: normalizeResumeTemplateId(preloadedResume.templateId),
            templateCategory: resolveTemplateCategory(normalizeResumeTemplateId(preloadedResume.templateId), preloadedResume.templateCategory),
            personalInfo: {
              ...defaultPersonalInfo,
              ...(preloadedResume.personalInfo ?? {}),
            },
            sections: {
              ...defaultResumeSections,
              ...(preloadedResume.sections ?? {}),
              experience: (preloadedResume.sections?.experience ?? []).map((entry) => ({
                ...entry,
                contentMode: entry.contentMode ?? "bullets",
                description: entry.description ?? "",
                bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
              })),
              projects: (preloadedResume.sections?.projects ?? []).map((entry) => ({
                ...entry,
                contentMode: entry.contentMode ?? "paragraph",
                description: entry.description ?? "",
                bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
              })),
            },
            style: {
              ...defaultStyle,
              ...(preloadedResume.style ?? {}),
            },
            sectionOrder: Array.isArray(preloadedResume.sectionOrder)
              ? [...preloadedResume.sectionOrder]
              : [...defaultSectionOrder],
            sectionVisibility: {
              ...defaultSectionVisibility,
              ...(preloadedResume.sectionVisibility ?? {}),
            },
            id: preloadedResume._id ?? preloadedResume.id ?? id,
          },
          ui: { ...s.ui, isSaved: true, isDirty: false, saveError: null },
        }));
      }

      try {
        const response = await api.get(`/resumes/${id}`);
        const loadedResume = response.data?.resume ?? response.data;

        set(s => ({
          resume: {
            ...initialResume,
            ...loadedResume,
            templateId: normalizeResumeTemplateId(loadedResume?.templateId),
            templateCategory: resolveTemplateCategory(normalizeResumeTemplateId(loadedResume?.templateId), loadedResume?.templateCategory),
            personalInfo: {
              ...defaultPersonalInfo,
              ...(loadedResume?.personalInfo ?? {}),
            },
            sections: {
              ...defaultResumeSections,
              ...(loadedResume?.sections ?? {}),
              experience: (loadedResume?.sections?.experience ?? []).map((entry: any) => ({
                ...entry,
                contentMode: entry.contentMode ?? "bullets",
                description: entry.description ?? "",
                bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
              })),
              projects: (loadedResume?.sections?.projects ?? []).map((entry: any) => ({
                ...entry,
                contentMode: entry.contentMode ?? "paragraph",
                description: entry.description ?? "",
                bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
              })),
            },
            style: {
              ...defaultStyle,
              ...(loadedResume?.style ?? {}),
            },
            sectionOrder: Array.isArray(loadedResume?.sectionOrder)
              ? [...loadedResume.sectionOrder]
              : [...defaultSectionOrder],
            sectionVisibility: {
              ...defaultSectionVisibility,
              ...(loadedResume?.sectionVisibility ?? {}),
            },
            id: loadedResume?._id ?? loadedResume?.id ?? id,
          },
          ui: { ...s.ui, isSaved: true, isDirty: false, saveError: null },
        }));
      } catch (error) {
        if (!preloadedResume) {
          set(s => ({ ui: { ...s.ui, saveError: "Failed to load resume." } }));
        }
      }
    },
  })))
);
