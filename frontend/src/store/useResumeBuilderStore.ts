import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  ResumeDocument, BuilderUIState, PersonalInfo, ResumeStyle,
  WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry,
  ActiveSection, EditorTab, PreviewScale, SectionVisibility,
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
    || s.experience.some(entry => [entry.company, entry.role, entry.start, entry.end, entry.location, ...entry.bullets].some(value => value.trim().length > 0))
    || s.education.some(entry => [entry.institution, entry.degree, entry.field, entry.year, entry.cgpa].some(value => value.trim().length > 0))
    || s.skills.some(group => group.category.trim().length > 0 || group.items.some(item => item.trim().length > 0))
    || s.projects.some(entry => [entry.name, entry.description, entry.tech, entry.link].some(value => value.trim().length > 0))
    || s.certifications.some(entry => [entry.name, entry.issuer, entry.year].some(value => value.trim().length > 0))
    || s.languages.some(entry => entry.language.trim().length > 0 || entry.proficiency.trim().length > 0);
};

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

  // ── Persistence ────────────────────────────────────────────────────────────
  saveResume: () => Promise<void>;
  loadResume: (id: string) => Promise<void>;
  initFromTemplate: (templateId: string) => void;
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
  previewScale: 0.75,
  isSaving: false,
  isSaved: false,
  isDirty: false,
  saveError: null,
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
          location: "", current: false, bullets: [""],
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
            projects: [...s.resume.sections.projects, { id: uid(), name: "", description: "", tech: "", link: "" }],
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

    // ─── Init from template ───────────────────────────────────────────────────
    initFromTemplate: (templateId) => {
      const stylePresets: Record<string, Partial<typeof defaultStyle>> = {
        classic:   { accentColor: "#1a1a1a", bodyFont: "EB Garamond, serif", headingFont: "EB Garamond, serif" },
        executive: { accentColor: "#1B2B4B", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "Playfair Display, serif" },
        modern:    { accentColor: "#0F766E", bodyFont: "DM Sans, sans-serif", headingFont: "DM Sans, sans-serif" },
        compact:   { accentColor: "#111111", bodyFont: "IBM Plex Sans, sans-serif", headingFont: "IBM Plex Sans, sans-serif", fontSize: "9.5pt" },
        sidebar:   { accentColor: "#1E293B", bodyFont: "Nunito Sans, sans-serif", headingFont: "Nunito Sans, sans-serif" },
      };
      set(s => ({
        resume: {
          ...s.resume,
          templateId,
          style: { ...defaultStyle, ...(stylePresets[templateId] ?? {}) },
        },
      }));
    },

    // ─── Save ────────────────────────────────────────────────────────────────
    saveResume: async () => {
      set(s => ({ ui: { ...s.ui, isSaving: true, saveError: null } }));
      try {
        const { resume } = get();

        if (!hasResumeContent(resume)) {
          set(s => ({ ui: { ...s.ui, isSaving: false, saveError: "Please enter information before saving your resume." } }));
          return;
        }

        const token = localStorage.getItem("accessToken");

        if (!token) {
          set(s => ({ ui: { ...s.ui, isSaving: false, saveError: "Please login before saving your resume." } }));
          return;
        }

        const response = resume.id
          ? await api.put(`/resumes/${resume.id}`, resume)
          : await api.post(`/resumes`, resume);

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
    loadResume: async (id) => {
      try {
        const token = localStorage.getItem("accessToken");

        if (!token) {
          set(s => ({ ui: { ...s.ui, saveError: "Please log in before loading a resume." } }));
          return;
        }

        const response = await api.get(`/resumes/${id}`);
        const loadedResume = response.data?.resume ?? response.data;

        set(s => ({
          resume: {
            ...loadedResume,
            id: loadedResume._id ?? loadedResume.id ?? id,
          },
          ui: { ...s.ui, isSaved: true, isDirty: false, saveError: null },
        }));
      } catch (error) {
        set(s => ({ ui: { ...s.ui, saveError: "Failed to load resume." } }));
      }
    },
  }))
);