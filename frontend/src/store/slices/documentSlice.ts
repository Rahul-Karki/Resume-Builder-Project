import {
  ResumeDocument, ResumeStyle, PersonalInfo, SectionVisibility,
  WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry,
  ActiveSection, defaultStyle, defaultPersonalInfo, defaultResumeSections,
  defaultSectionVisibility, defaultSectionOrder,
} from "@/types/resume-types";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";
import { getTemplateBaseStyle } from "@/store/templateConfig";

const uid = () => window.crypto.randomUUID().slice(0, 8);

interface DocumentSliceState {
  resume: ResumeDocument;
  ui: {
    isDirty: boolean;
    isSaved: boolean;
    activeSection?: string;
  };
}

export const initialResume: ResumeDocument = {
  title: "Untitled Resume",
  templateId: "classic",
  personalInfo: { ...defaultPersonalInfo },
  sections: { ...defaultResumeSections },
  style: { ...defaultStyle },
  sectionOrder: [...defaultSectionOrder],
  sectionVisibility: { ...defaultSectionVisibility },
};

export interface DocumentSlice {
  resume: ResumeDocument;
  markDirty: () => void;
  updatePersonalInfo: (field: keyof PersonalInfo, value: string) => void;
  updateStyle: (field: keyof ResumeStyle, value: string | boolean) => void;
  resetStyle: () => void;
  addExperience: () => void;
  updateExperience: (id: string, field: keyof WorkEntry, value: string | boolean | string[]) => void;
  removeExperience: (id: string) => void;
  addBullet: (expId: string) => void;
  updateBullet: (expId: string, index: number, value: string) => void;
  removeBullet: (expId: string, index: number) => void;
  reorderExperience: (fromIdx: number, toIdx: number) => void;
  addEducation: () => void;
  updateEducation: (id: string, field: keyof EduEntry, value: string) => void;
  removeEducation: (id: string) => void;
  addSkillGroup: () => void;
  updateSkillGroup: (id: string, field: keyof SkillGroup, value: string | string[]) => void;
  removeSkillGroup: (id: string) => void;
  addProject: () => void;
  updateProject: (id: string, field: keyof Project, value: string) => void;
  addProjectBullet: (projectId: string) => void;
  updateProjectBullet: (projectId: string, index: number, value: string) => void;
  removeProjectBullet: (projectId: string, index: number) => void;
  removeProject: (id: string) => void;
  addCertification: () => void;
  updateCertification: (id: string, field: keyof CertEntry, value: string) => void;
  removeCertification: (id: string) => void;
  addLanguage: () => void;
  updateLanguage: (id: string, field: keyof LanguageEntry, value: string) => void;
  removeLanguage: (id: string) => void;
  toggleSectionVisibility: (section: keyof SectionVisibility) => void;
  reorderSections: (fromIdx: number, toIdx: number) => void;
  setTitle: (title: string) => void;
}

export function createDocumentSlice(set: any, get: any): DocumentSlice {
  return {
    resume: { ...initialResume, personalInfo: { ...defaultPersonalInfo }, sections: { ...defaultResumeSections }, style: { ...defaultStyle }, sectionOrder: [...defaultSectionOrder], sectionVisibility: { ...defaultSectionVisibility } },

    markDirty: () => set((state: DocumentSliceState) => { state.ui.isDirty = true; state.ui.isSaved = false; }),

    updatePersonalInfo: (field, value) => set((state: DocumentSliceState) => {
      state.resume.personalInfo[field] = value;
      state.ui.isDirty = true;
      state.ui.isSaved = false;
    }),

    updateStyle: (field, value) => set((state: DocumentSliceState) => {
      (state.resume.style as any)[field] = value;
      state.ui.isDirty = true;
      state.ui.isSaved = false;
    }),

    resetStyle: () => set((state: DocumentSliceState) => {
      state.resume.style = { ...getTemplateBaseStyle(normalizeResumeTemplateId(state.resume.templateId)) };
      state.ui.isDirty = true;
      state.ui.isSaved = false;
    }),

    addExperience: () => set((state: DocumentSliceState) => {
      const newEntry: WorkEntry = {
        id: uid(), company: "", role: "", start: "", end: "",
        location: "", current: false, contentMode: "bullets", description: "", bullets: [""],
      };
      state.resume.sections.experience.push(newEntry);
      state.resume.sectionVisibility.experience = true;
      state.ui.isDirty = true;
      state.ui.activeSection = "experience";
    }),

    updateExperience: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.experience.find((e: any) => e.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
      state.ui.isSaved = false;
    }),

    removeExperience: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.experience = state.resume.sections.experience.filter((e: any) => e.id !== id);
      if (state.resume.sections.experience.length === 0) state.resume.sectionVisibility.experience = false;
      state.ui.isDirty = true;
    }),

    addBullet: (expId) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.experience.find((e: any) => e.id === expId);
      if (entry) entry.bullets.push("");
      state.ui.isDirty = true;
    }),

    updateBullet: (expId, index, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.experience.find((e: any) => e.id === expId);
      if (entry && index >= 0 && index < entry.bullets.length) entry.bullets[index] = value;
      state.ui.isDirty = true;
    }),

    removeBullet: (expId, index) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.experience.find((e: any) => e.id === expId);
      if (entry) entry.bullets = entry.bullets.filter((_: any, i: number) => i !== index);
      state.ui.isDirty = true;
    }),

    reorderExperience: (fromIdx, toIdx) => set((state: DocumentSliceState) => {
      const arr = state.resume.sections.experience;
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
    }),

    addEducation: () => set((state: DocumentSliceState) => {
      state.resume.sections.education.push({ id: uid(), institution: "", degree: "", field: "", year: "", cgpa: "" });
      state.resume.sectionVisibility.education = true;
      state.ui.isDirty = true;
      state.ui.activeSection = "education";
    }),

    updateEducation: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.education.find((e: any) => e.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
    }),

    removeEducation: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.education = state.resume.sections.education.filter((e: any) => e.id !== id);
      if (state.resume.sections.education.length === 0) state.resume.sectionVisibility.education = false;
      state.ui.isDirty = true;
    }),

    addSkillGroup: () => set((state: DocumentSliceState) => {
      state.resume.sections.skills.push({ id: uid(), category: "Skills", items: [] });
      state.resume.sectionVisibility.skills = true;
      state.ui.isDirty = true;
      state.ui.activeSection = "skills";
    }),

    updateSkillGroup: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.skills.find((sk: any) => sk.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
    }),

    removeSkillGroup: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.skills = state.resume.sections.skills.filter((sk: any) => sk.id !== id);
      if (state.resume.sections.skills.length === 0) state.resume.sectionVisibility.skills = false;
      state.ui.isDirty = true;
    }),

    addProject: () => set((state: DocumentSliceState) => {
      state.resume.sections.projects.push({ id: uid(), name: "", contentMode: "paragraph", description: "", bullets: [""], tech: "", link: "" });
      state.resume.sectionVisibility.projects = true;
      state.ui.isDirty = true;
      state.ui.activeSection = "projects";
    }),

    updateProject: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.projects.find((p: any) => p.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
    }),

    addProjectBullet: (projectId) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.projects.find((p: any) => p.id === projectId);
      if (entry) entry.bullets.push("");
      state.ui.isDirty = true;
    }),

    updateProjectBullet: (projectId, index, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.projects.find((p: any) => p.id === projectId);
      if (entry && index >= 0 && index < entry.bullets.length) entry.bullets[index] = value;
      state.ui.isDirty = true;
    }),

    removeProjectBullet: (projectId, index) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.projects.find((p: any) => p.id === projectId);
      if (entry) entry.bullets = entry.bullets.filter((_: any, i: number) => i !== index);
      state.ui.isDirty = true;
    }),

    removeProject: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.projects = state.resume.sections.projects.filter((p: any) => p.id !== id);
      if (state.resume.sections.projects.length === 0) state.resume.sectionVisibility.projects = false;
      state.ui.isDirty = true;
    }),

    addCertification: () => set((state: DocumentSliceState) => {
      state.resume.sections.certifications.push({ id: uid(), name: "", issuer: "", year: "", url: "" });
      state.resume.sectionVisibility.certifications = true;
      state.ui.isDirty = true;
    }),

    updateCertification: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.certifications.find((c: any) => c.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
    }),

    removeCertification: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.certifications = state.resume.sections.certifications.filter((c: any) => c.id !== id);
      if (state.resume.sections.certifications.length === 0) state.resume.sectionVisibility.certifications = false;
      state.ui.isDirty = true;
    }),

    addLanguage: () => set((state: DocumentSliceState) => {
      state.resume.sections.languages.push({ id: uid(), language: "", proficiency: "Fluent" });
      state.resume.sectionVisibility.languages = true;
      state.ui.isDirty = true;
    }),

    updateLanguage: (id, field, value) => set((state: DocumentSliceState) => {
      const entry = state.resume.sections.languages.find((l: any) => l.id === id);
      if (entry) (entry as any)[field] = value;
      state.ui.isDirty = true;
    }),

    removeLanguage: (id) => set((state: DocumentSliceState) => {
      state.resume.sections.languages = state.resume.sections.languages.filter((l: any) => l.id !== id);
      if (state.resume.sections.languages.length === 0) state.resume.sectionVisibility.languages = false;
      state.ui.isDirty = true;
    }),

    toggleSectionVisibility: (section) => set((state: DocumentSliceState) => {
      state.resume.sectionVisibility[section] = !state.resume.sectionVisibility[section];
      state.ui.isDirty = true;
    }),

    reorderSections: (fromIdx, toIdx) => set((state: DocumentSliceState) => {
      const arr = state.resume.sectionOrder;
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
    }),

    setTitle: (title) => set((state: DocumentSliceState) => { state.resume.title = title; state.ui.isDirty = true; }),
  };
}
