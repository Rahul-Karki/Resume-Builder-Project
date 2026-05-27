import { useResumeBuilderStore } from "./useResumeBuilderStore";
import type { ResumeDocument, BuilderUIState, PersonalInfo, ResumeStyle, SectionVisibility, ActiveSection, EditorTab } from "@/types/resume-types";

export function useResume() {
  return useResumeBuilderStore((s) => s.resume);
}

export function useResumeUI() {
  return useResumeBuilderStore((s) => s.ui);
}

export function usePersonalInfo() {
  return useResumeBuilderStore((s) => s.resume.personalInfo);
}

export function useResumeStyle() {
  return useResumeBuilderStore((s) => s.resume.style);
}

export function useSectionVisibility() {
  return useResumeBuilderStore((s) => s.resume.sectionVisibility);
}

export function useSectionOrder() {
  return useResumeBuilderStore((s) => s.resume.sectionOrder);
}

export function useExperience() {
  return useResumeBuilderStore((s) => s.resume.sections.experience);
}

export function useEducation() {
  return useResumeBuilderStore((s) => s.resume.sections.education);
}

export function useSkills() {
  return useResumeBuilderStore((s) => s.resume.sections.skills);
}

export function useProjects() {
  return useResumeBuilderStore((s) => s.resume.sections.projects);
}

export function useCertifications() {
  return useResumeBuilderStore((s) => s.resume.sections.certifications);
}

export function useLanguages() {
  return useResumeBuilderStore((s) => s.resume.sections.languages);
}

export function useIsSaving() {
  return useResumeBuilderStore((s) => s.ui.isSaving);
}

export function useIsDirty() {
  return useResumeBuilderStore((s) => s.ui.isDirty);
}

export function useTemplateId() {
  return useResumeBuilderStore((s) => s.resume.templateId);
}

export function useTemplateCategory() {
  return useResumeBuilderStore((s) => s.resume.templateCategory);
}

export function useActiveSection() {
  return useResumeBuilderStore((s) => s.ui.activeSection);
}

export function useFocusedField() {
  return useResumeBuilderStore((s) => s.ui.focusedField);
}

export function useResumeActions() {
  return useResumeBuilderStore((s) => ({
    updatePersonalInfo: s.updatePersonalInfo,
    updateStyle: s.updateStyle,
    resetStyle: s.resetStyle,
    addExperience: s.addExperience,
    updateExperience: s.updateExperience,
    removeExperience: s.removeExperience,
    addBullet: s.addBullet,
    updateBullet: s.updateBullet,
    removeBullet: s.removeBullet,
    reorderExperience: s.reorderExperience,
    addEducation: s.addEducation,
    updateEducation: s.updateEducation,
    removeEducation: s.removeEducation,
    addSkillGroup: s.addSkillGroup,
    updateSkillGroup: s.updateSkillGroup,
    removeSkillGroup: s.removeSkillGroup,
    addProject: s.addProject,
    updateProject: s.updateProject,
    addProjectBullet: s.addProjectBullet,
    updateProjectBullet: s.updateProjectBullet,
    removeProjectBullet: s.removeProjectBullet,
    removeProject: s.removeProject,
    addCertification: s.addCertification,
    updateCertification: s.updateCertification,
    removeCertification: s.removeCertification,
    addLanguage: s.addLanguage,
    updateLanguage: s.updateLanguage,
    removeLanguage: s.removeLanguage,
    toggleSectionVisibility: s.toggleSectionVisibility,
    reorderSections: s.reorderSections,
    setTitle: s.setTitle,
    setActiveTab: s.setActiveTab,
    setActiveSection: s.setActiveSection,
    setFocusedField: s.setFocusedField,
    setPreviewScale: s.setPreviewScale,
    setExportPreset: s.setExportPreset,
    saveResume: s.saveResume,
    loadResume: s.loadResume,
    initFromTemplate: s.initFromTemplate,
    applyTemplateUpgrade: s.applyTemplateUpgrade,
    markDirty: s.markDirty,
  }));
}