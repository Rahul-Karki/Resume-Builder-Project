import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  ResumeDocument, BuilderUIState, PersonalInfo, ResumeStyle,
  WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry,
  ActiveSection, EditorTab, ExportPreset, PreviewScale, SectionVisibility,
  defaultStyle, defaultPersonalInfo, defaultResumeSections,
  defaultSectionVisibility, defaultSectionOrder,
} from "@/types/resume-types";
import { api } from "@/services/api";

// ─── Helper: generate IDs ──────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const hasResumeContent = (resume: ResumeDocument) => {
  const p = resume.personalInfo;
  const s = resume.sections;

  const personalFields = [
    p.name, p.title, p.email, p.phone, p.location, p.linkedin, p.portfolio, p.summary,
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
  templateId: resume.templateId,
  personalInfo: {
    name: resume.personalInfo.name,
    title: resume.personalInfo.title,
    email: resume.personalInfo.email,
    phone: resume.personalInfo.phone,
    location: resume.personalInfo.location,
    linkedin: resume.personalInfo.linkedin,
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
  setPreviewScale: (scale: PreviewScale) => void;
  setExportPreset: (preset: ExportPreset) => void;

  // ── Persistence ────────────────────────────────────────────────────────────
  saveResume: () => Promise<void>;
  loadResume: (id: string, preloadedResume?: ResumeDocument) => Promise<void>;
  initFromTemplate: (templateId: string) => Promise<void>;
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

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useResumeBuilderStore = create<ResumeBuilderStore>()(
  subscribeWithSelector((set, get) => ({
    resume: initialResume,
    ui: initialUI,

    markDirty: () => set(s => ({ ui: { ...s.ui, isDirty: true, isSaved: false } })),

    // ─── Personal Info ───────────────────────────────────────────────────────
    updatePersonalInfo: (field, value) =>
      set(s => ({
        resume: { ...s.resume, personalInfo: { ...s.resume.personalInfo, [field]: value } },
        ui: { ...s.ui, isDirty: true, isSaved: false },
      })),

    // ─── Style ──────────────────────────────────────────────────────────────
    updateStyle: (field, value) =>
      set(s => ({
        resume: { ...s.resume, style: { ...s.resume.style, [field]: value } },
        ui: { ...s.ui, isDirty: true, isSaved: false },
      })),

    resetStyle: () =>
      set(s => ({
        resume: { ...s.resume, style: { ...defaultStyle } },
        ui: { ...s.ui, isDirty: true, isSaved: false },
      })),

    // ─── Experience ──────────────────────────────────────────────────────────
    addExperience: () =>
      set(s => {
        const newEntry: WorkEntry = {
          id: uid(), company: "", role: "", start: "", end: "",
          location: "", current: false, contentMode: "bullets", description: "", bullets: [""],
        };
        return {
          resume: { ...s.resume, sections: { ...s.resume.sections, experience: [...s.resume.sections.experience, newEntry] } },
          ui: { ...s.ui, isDirty: true, activeSection: "experience" },
        };
      }),

    updateExperience: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            experience: s.resume.sections.experience.map(e => e.id === id ? { ...e, [field]: value } : e),
          },
        },
        ui: { ...s.ui, isDirty: true, isSaved: false },
      })),

    removeExperience: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, experience: s.resume.sections.experience.filter(e => e.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    addBullet: (expId) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            experience: s.resume.sections.experience.map(e =>
              e.id === expId ? { ...e, bullets: [...e.bullets, ""] } : e
            ),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    updateBullet: (expId, index, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            experience: s.resume.sections.experience.map(e => {
              if (e.id !== expId) return e;
              const bullets = [...e.bullets];
              bullets[index] = value;
              return { ...e, bullets };
            }),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeBullet: (expId, index) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            experience: s.resume.sections.experience.map(e => {
              if (e.id !== expId) return e;
              return { ...e, bullets: e.bullets.filter((_, i) => i !== index) };
            }),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    reorderExperience: (fromIdx, toIdx) =>
      set(s => {
        const arr = [...s.resume.sections.experience];
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
        return { resume: { ...s.resume, sections: { ...s.resume.sections, experience: arr } } };
      }),

    // ─── Education ───────────────────────────────────────────────────────────
    addEducation: () =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            education: [...s.resume.sections.education, { id: uid(), institution: "", degree: "", field: "", year: "", cgpa: "" }],
          },
        },
        ui: { ...s.ui, isDirty: true, activeSection: "education" },
      })),

    updateEducation: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            education: s.resume.sections.education.map(e => e.id === id ? { ...e, [field]: value } : e),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeEducation: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, education: s.resume.sections.education.filter(e => e.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    // ─── Skills ──────────────────────────────────────────────────────────────
    addSkillGroup: () =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            skills: [...s.resume.sections.skills, { id: uid(), category: "Skills", items: [] }],
          },
        },
        ui: { ...s.ui, isDirty: true, activeSection: "skills" },
      })),

    updateSkillGroup: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            skills: s.resume.sections.skills.map(sk => sk.id === id ? { ...sk, [field]: value } : sk),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeSkillGroup: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, skills: s.resume.sections.skills.filter(sk => sk.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    // ─── Projects ────────────────────────────────────────────────────────────
    addProject: () =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            projects: [...s.resume.sections.projects, { id: uid(), name: "", contentMode: "paragraph", description: "", bullets: [""], tech: "", link: "" }],
          },
        },
        ui: { ...s.ui, isDirty: true, activeSection: "projects" },
      })),

    updateProject: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            projects: s.resume.sections.projects.map(p => p.id === id ? { ...p, [field]: value } : p),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    addProjectBullet: (projectId) =>
      set(s => ({
        resume: {
          ...s.resume,
          sections: {
            ...s.resume.sections,
            projects: s.resume.sections.projects.map((p) =>
              p.id === projectId ? { ...p, bullets: [...p.bullets, ""] } : p,
            ),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    updateProjectBullet: (projectId, index, value) =>
      set(s => ({
        resume: {
          ...s.resume,
          sections: {
            ...s.resume.sections,
            projects: s.resume.sections.projects.map((p) => {
              if (p.id !== projectId) return p;
              const bullets = [...p.bullets];
              bullets[index] = value;
              return { ...p, bullets };
            }),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeProjectBullet: (projectId, index) =>
      set(s => ({
        resume: {
          ...s.resume,
          sections: {
            ...s.resume.sections,
            projects: s.resume.sections.projects.map((p) => {
              if (p.id !== projectId) return p;
              return { ...p, bullets: p.bullets.filter((_, i) => i !== index) };
            }),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeProject: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, projects: s.resume.sections.projects.filter(p => p.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    // ─── Certifications ──────────────────────────────────────────────────────
    addCertification: () =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            certifications: [...s.resume.sections.certifications, { id: uid(), name: "", issuer: "", year: "" }],
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    updateCertification: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            certifications: s.resume.sections.certifications.map(c => c.id === id ? { ...c, [field]: value } : c),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeCertification: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, certifications: s.resume.sections.certifications.filter(c => c.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    // ─── Languages ───────────────────────────────────────────────────────────
    addLanguage: () =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            languages: [...s.resume.sections.languages, { id: uid(), language: "", proficiency: "Fluent" }],
          },
          sectionVisibility: { ...s.resume.sectionVisibility, languages: true },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    updateLanguage: (id, field, value) =>
      set(s => ({
        resume: {
          ...s.resume, sections: {
            ...s.resume.sections,
            languages: s.resume.sections.languages.map(l => l.id === id ? { ...l, [field]: value } : l),
          },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    removeLanguage: (id) =>
      set(s => ({
        resume: { ...s.resume, sections: { ...s.resume.sections, languages: s.resume.sections.languages.filter(l => l.id !== id) } },
        ui: { ...s.ui, isDirty: true },
      })),

    // ─── Sections Management ─────────────────────────────────────────────────
    toggleSectionVisibility: (section) =>
      set(s => ({
        resume: {
          ...s.resume,
          sectionVisibility: { ...s.resume.sectionVisibility, [section]: !s.resume.sectionVisibility[section] },
        },
        ui: { ...s.ui, isDirty: true },
      })),

    reorderSections: (fromIdx, toIdx) =>
      set(s => {
        const arr = [...s.resume.sectionOrder];
        const [item] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, item);
        return { resume: { ...s.resume, sectionOrder: arr } };
      }),

    setTitle: (title) =>
      set(s => ({ resume: { ...s.resume, title }, ui: { ...s.ui, isDirty: true } })),

    // ─── UI Controls ─────────────────────────────────────────────────────────
    setActiveTab: (tab) => set(s => ({ ui: { ...s.ui, activeTab: tab } })),
    setActiveSection: (section) => set(s => ({ ui: { ...s.ui, activeSection: section } })),
    setPreviewScale: (scale) => set(s => ({ ui: { ...s.ui, previewScale: scale } })),
    setExportPreset: (preset) => set(s => ({ ui: { ...s.ui, exportPreset: preset } })),

    // ─── Init from template ───────────────────────────────────────────────────
    initFromTemplate: async (templateId) => {
      const stylePresets: Record<string, Partial<typeof defaultStyle>> = {
        classic:   { accentColor: "#1a1a1a", bodyFont: "EB Garamond, serif", headingFont: "EB Garamond, serif" },
        executive: { accentColor: "#1B2B4B", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "Playfair Display, serif" },
        modern:    { accentColor: "#0F766E", bodyFont: "DM Sans, sans-serif", headingFont: "DM Sans, sans-serif" },
        compact:   { accentColor: "#111111", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "IBM Plex Sans, sans-serif", fontSize: "9.5pt" },
        sidebar:   { accentColor: "#1E293B", bodyFont: "Nunito Sans, sans-serif", headingFont: "Nunito Sans, sans-serif" },
        scholarly: { accentColor: "#1a1a1a", bodyFont: "Source Serif 4, serif", headingFont: "Playfair Display, serif" },
        research:  { accentColor: "#1f1f1f", bodyFont: "Source Serif 4, serif", headingFont: "Playfair Display, serif" },
      };
      const sectionVisibilityPresets = {
        classic:   { ...defaultSectionVisibility },
        executive: { ...defaultSectionVisibility },
        modern:    { ...defaultSectionVisibility },
        compact:   { ...defaultSectionVisibility },
        sidebar:   { ...defaultSectionVisibility },
        scholarly: { ...defaultSectionVisibility },
        research:  { ...defaultSectionVisibility },
      } as Record<string, typeof defaultSectionVisibility>;

      const baseStyle = { ...defaultStyle, ...(stylePresets[templateId] ?? {}) };
      const baseVisibility = { ...(sectionVisibilityPresets[templateId] ?? defaultSectionVisibility) };

      try {
        const response = await api.get("/templates");
        const templates = Array.isArray(response.data?.data) ? response.data.data : [];
        const matchedTemplate = templates.find((template: any) => template?.layoutId === templateId);

        if (matchedTemplate) {
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

          set(() => ({
            resume: {
              ...initialResume,
              templateId,
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
              sectionOrder: [...defaultSectionOrder],
            },
            ui: {
              ...initialUI,
            },
          }));

          return;
        }
      } catch {
        // Fall back to local presets when templates API is unavailable.
      }

      set(() => ({
        resume: {
          ...initialResume,
          templateId,
          style: baseStyle,
          sectionVisibility: baseVisibility,
          sectionOrder: [...defaultSectionOrder],
        },
        ui: {
          ...initialUI,
        },
      }));
    },

    // ─── Save ────────────────────────────────────────────────────────────────
    saveResume: async () => {
      set(s => ({ ui: { ...s.ui, isSaving: true, saveError: null } }));
      try {
        const { resume } = get();
        const payload = toResumePayload(resume);

        if (!hasResumeContent(resume)) {
          set(s => ({ ui: { ...s.ui, isSaving: false, saveError: "Please enter information before saving your resume." } }));
          return;
        }

        const response = resume.id
          ? await api.put(`/resumes/${resume.id}`, payload)
          : await api.post(`/resumes`, payload);

        const savedResume = response.data?.resume ?? response.data;
        const savedId = savedResume?._id ?? savedResume?.id ?? resume.id ?? `res_${Date.now()}`;

        set(s => ({
          resume: { ...s.resume, id: savedId, updatedAt: savedResume?.updatedAt ?? new Date().toISOString() },
          ui: { ...s.ui, isSaving: false, isSaved: true, isDirty: false },
        }));
      } catch (err) {
        set(s => ({ ui: { ...s.ui, isSaving: false, saveError: "Failed to save. Please try again." } }));
      }
    },

    // ─── Load ────────────────────────────────────────────────────────────────
    loadResume: async (id, preloadedResume) => {
      if (preloadedResume) {
        set(s => ({
          resume: {
            ...initialResume,
            ...preloadedResume,
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
  }))
);