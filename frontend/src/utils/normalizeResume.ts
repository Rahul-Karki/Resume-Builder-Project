import type { ResumeDocument } from "@/types/resume-types";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";
import { resolveTemplateCategory } from "@/store/templateConfig";
import { initialResume } from "@/store/slices/documentSlice";

type RawSections = {
  experience?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  skills?: Array<Record<string, unknown>>;
  certifications?: Array<Record<string, unknown>>;
  languages?: Array<Record<string, unknown>>;
};

const normalizeExperienceEntry = (entry: Record<string, unknown>) => ({
  ...entry,
  contentMode: entry.contentMode ?? "bullets",
  description: entry.description ?? "",
  bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
});

const normalizeProjectEntry = (entry: Record<string, unknown>) => ({
  ...entry,
  contentMode: entry.contentMode ?? "paragraph",
  description: entry.description ?? "",
  bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
});

const normalizeSections = (sections: RawSections) => ({
  ...(initialResume.sections),
  ...sections,
  experience: (sections.experience ?? []).map(normalizeExperienceEntry),
  projects: (sections.projects ?? []).map(normalizeProjectEntry),
});

const EMPTY_PERSONAL = {
  name: "", title: "", email: "", phone: "", location: "",
  linkedin: "", github: "", portfolio: "", summary: "",
};
const EMPTY_SECTIONS = {
  experience: [], education: [], skills: [], projects: [],
  certifications: [], languages: [],
};

export function normalizeResumeFromApi(
  data: Record<string, unknown>,
  fallbackId: string,
): ResumeDocument {
  const sections = (data.sections ?? {}) as RawSections;
  return {
    ...initialResume,
    ...data,
    templateId: normalizeResumeTemplateId(data?.templateId as string),
    templateCategory: resolveTemplateCategory(
      normalizeResumeTemplateId(data?.templateId as string),
      data?.templateCategory as string | undefined,
    ),
    personalInfo: { ...EMPTY_PERSONAL, ...((data?.personalInfo ?? {}) as Record<string, string>) },
    sections: normalizeSections(sections),
    style: { ...(initialResume.style), ...((data?.style ?? {}) as Record<string, unknown>) },
    sectionOrder: Array.isArray(data?.sectionOrder)
      ? [...(data.sectionOrder as string[])]
      : [...(initialResume.sectionOrder)],
    sectionVisibility: {
      ...(initialResume.sectionVisibility),
      ...((data?.sectionVisibility ?? {}) as Record<string, boolean>),
    },
    id: (data as any)._id ?? (data?.id as string) ?? fallbackId,
  } as ResumeDocument;
}

export function normalizeResumeFromPreloaded(
  preloaded: ResumeDocument,
  fallbackId: string,
): ResumeDocument {
  const sections = (preloaded.sections ?? {}) as unknown as RawSections;
  return {
    ...initialResume,
    ...preloaded,
    templateId: normalizeResumeTemplateId(preloaded.templateId),
    templateCategory: resolveTemplateCategory(
      normalizeResumeTemplateId(preloaded.templateId),
      preloaded.templateCategory,
    ),
    personalInfo: { ...(initialResume.personalInfo), ...(preloaded.personalInfo ?? {}) },
    sections: normalizeSections(sections),
    style: { ...(initialResume.style), ...(preloaded.style ?? {}) },
    sectionOrder: Array.isArray(preloaded.sectionOrder)
      ? [...preloaded.sectionOrder]
      : [...(initialResume.sectionOrder)],
    sectionVisibility: {
      ...(initialResume.sectionVisibility),
      ...(preloaded.sectionVisibility ?? {}),
    },
    id: (preloaded as any)._id ?? preloaded.id ?? fallbackId,
  } as ResumeDocument;
}
