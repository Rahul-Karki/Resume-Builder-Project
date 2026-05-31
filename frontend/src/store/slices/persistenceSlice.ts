import { ResumeDocument } from "@/types/resume-types";
import { api } from "@/services/api";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";
import { normalizeResumeFromApi, normalizeResumeFromPreloaded } from "@/utils/normalizeResume";
import { resolveTemplateConfig, mergeTemplateVisibilityForExistingResume } from "@/store/templateConfig";
import { initialResume } from "./documentSlice";

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
      id: entry.id, company: entry.company, role: entry.role,
      start: entry.start, end: entry.end, location: entry.location,
      current: entry.current, contentMode: entry.contentMode,
      description: entry.description, bullets: [...entry.bullets],
    })),
    education: resume.sections.education.map((entry) => ({
      id: entry.id, institution: entry.institution, degree: entry.degree,
      field: entry.field, year: entry.year, cgpa: entry.cgpa,
    })),
    skills: resume.sections.skills.map((entry) => ({
      id: entry.id, category: entry.category, items: [...entry.items],
    })),
    projects: resume.sections.projects.map((entry) => ({
      id: entry.id, name: entry.name, contentMode: entry.contentMode,
      description: entry.description, bullets: [...entry.bullets],
      tech: entry.tech, link: entry.link,
    })),
    certifications: resume.sections.certifications.map((entry) => ({
      id: entry.id, name: entry.name, issuer: entry.issuer, year: entry.year,
    })),
    languages: resume.sections.languages.map((entry) => ({
      id: entry.id, language: entry.language, proficiency: entry.proficiency,
    })),
  },
  style: {
    accentColor: resume.style.accentColor, headingColor: resume.style.headingColor,
    textColor: resume.style.textColor, mutedColor: resume.style.mutedColor,
    borderColor: resume.style.borderColor, backgroundColor: resume.style.backgroundColor,
    bodyFont: resume.style.bodyFont, headingFont: resume.style.headingFont,
    fontSize: resume.style.fontSize, lineHeight: resume.style.lineHeight,
    pageMargin: resume.style.pageMargin, sectionSpacing: resume.style.sectionSpacing,
    showDividers: resume.style.showDividers, bulletStyle: resume.style.bulletStyle,
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

export interface PersistenceSlice {
  saveResume: () => Promise<void>;
  loadResume: (id: string, preloadedResume?: ResumeDocument) => Promise<void>;
  initFromTemplate: (templateId: string) => Promise<void>;
  applyTemplateUpgrade: (templateId: string) => Promise<void>;
}

export function createPersistenceSlice(set: any, get: any): PersistenceSlice {
  return {
    saveResume: async () => {
      const { resume } = get();
      const previousResume = { ...resume };
      const timestamp = new Date().toISOString();

      set((s: any) => ({ ui: { ...s.ui, isSaving: true, isSaved: false, saveError: null } }));

      try {
        const payload = toResumePayload(resume);
        const hasServerId = !!(resume.id && !resume.id.startsWith('res_'));
        const response = hasServerId
          ? await api.put(`/resumes/${resume.id}`, payload)
          : await api.post(`/resumes`, payload);

        const savedResume = response.data?.resume ?? response.data;
        const savedId = savedResume?._id ?? savedResume?.id;
        if (!savedId) throw new Error('Server did not return a resume ID');

        set((s: any) => ({
          resume: { ...s.resume, id: savedId, updatedAt: savedResume?.updatedAt ?? timestamp },
          ui: { ...s.ui, isSaving: false, isSaved: true, isDirty: false },
        }));
      } catch (err) {
        set({
          resume: previousResume,
          ui: { ...get().ui, isSaving: false, saveError: "Failed to save. Your changes have been preserved locally." },
        });
      }
    },

    loadResume: async (id, preloadedResume) => {
      if (preloadedResume) {
        set((s: any) => ({
          resume: normalizeResumeFromPreloaded(preloadedResume, id),
          ui: { ...s.ui, isSaved: true, isDirty: false, saveError: null },
        }));
        return;
      }

      try {
        const response = await api.get(`/resumes/${id}`);
        const loadedResume = response.data?.resume ?? response.data;

        if (!loadedResume) {
          set((s: any) => ({ ui: { ...s.ui, saveError: "Failed to load resume." } }));
          return;
        }

        set((s: any) => ({
          resume: normalizeResumeFromApi(loadedResume, id),
          ui: { ...s.ui, isSaved: true, isDirty: false, saveError: null },
        }));
      } catch (error) {
        if (!preloadedResume) {
          set((s: any) => ({ ui: { ...s.ui, saveError: "Failed to load resume." } }));
        }
      }
    },

    initFromTemplate: async (templateId) => {
      const resolvedTemplate = await resolveTemplateConfig(templateId);
      set({
        resume: {
          ...initialResume,
          templateId: resolvedTemplate.templateId,
          templateCategory: resolvedTemplate.templateCategory,
          style: resolvedTemplate.style,
          sectionVisibility: resolvedTemplate.sectionVisibility,
          sectionOrder: [...(initialResume.sectionOrder)],
        },
        ui: {
          activeTab: "content" as const,
          activeSection: "personal" as const,
          focusedField: null,
          previewScale: 0.5,
          exportPreset: "standard" as const,
          isSaving: false,
          isSaved: false,
          isDirty: false,
          saveError: null,
        },
      });
    },

    applyTemplateUpgrade: async (templateId) => {
      const resolvedTemplate = await resolveTemplateConfig(templateId);
      const currentResume = get().resume;

      set((s: any) => ({
        resume: {
          ...s.resume,
          templateId: resolvedTemplate.templateId,
          templateCategory: resolvedTemplate.templateCategory,
          style: resolvedTemplate.style,
          sectionVisibility: mergeTemplateVisibilityForExistingResume(currentResume, resolvedTemplate.sectionVisibility),
        },
        ui: { ...s.ui, isDirty: true, isSaved: false, saveError: null },
      }));
    },
  };
}
