import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { ResumeDocument, SavedResume, TemplateId, User } from "@/types/resume-types";

const sectionKeys = ["experience", "education", "skills", "projects", "certifications"] as const;
const supportedTemplateIds: TemplateId[] = ["classic", "executive", "modern", "compact", "sidebar"];

const getResumeId = (resume: ResumeDocument) => resume._id ?? resume.id ?? "";

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 401 || status === 403;
}

export function calculateCompletionScore(resume: ResumeDocument): number {
  const personalInfo = resume.personalInfo ?? {};
  const personalFields = [
    personalInfo.name,
    personalInfo.title,
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.portfolio,
    personalInfo.summary,
  ].filter(Boolean).length;

  const sectionCounts = sectionKeys.map((key) => (Array.isArray(resume.sections?.[key]) ? resume.sections?.[key]?.length ?? 0 : 0));
  const filledSectionKinds = sectionCounts.filter((count) => count > 0).length;
  const totalEntries = sectionCounts.reduce((sum, count) => sum + count, 0);

  const score = Math.round(
    (personalFields / 8) * 45 +
      (filledSectionKinds / sectionKeys.length) * 35 +
      Math.min(totalEntries, 10) * 2,
  );

  return Math.max(0, Math.min(score, 100));
}

export function mapResumeDocumentToSavedResume(resume: ResumeDocument): SavedResume {
  const sectionCounts = {
    experience: Array.isArray(resume.sections?.experience) ? resume.sections?.experience?.length ?? 0 : 0,
    education: Array.isArray(resume.sections?.education) ? resume.sections?.education?.length ?? 0 : 0,
    skills: Array.isArray(resume.sections?.skills) ? resume.sections?.skills?.length ?? 0 : 0,
    projects: Array.isArray(resume.sections?.projects) ? resume.sections?.projects?.length ?? 0 : 0,
    certifications: Array.isArray(resume.sections?.certifications) ? resume.sections?.certifications?.length ?? 0 : 0,
  };

  const personalInfo = resume.personalInfo ?? {};

  return {
    id: getResumeId(resume),
    title: resume.title || personalInfo.title || "Untitled Resume",
    templateId: supportedTemplateIds.includes(resume.templateId as TemplateId)
      ? (resume.templateId as TemplateId)
      : "classic",
    updatedAt: resume.updatedAt || resume.createdAt || new Date().toISOString(),
    createdAt: resume.createdAt || resume.updatedAt || new Date().toISOString(),
    completionScore: calculateCompletionScore(resume),
    personalInfo: {
      name: personalInfo.name || "",
      title: personalInfo.title || "",
      email: personalInfo.email || "",
      location: personalInfo.location || "",
    },
    sectionCounts,
  };
}

export function getResumePayload(resume: ResumeDocument) {
  const { _id, id, createdAt, updatedAt, ...payload } = resume;
  return payload;
}

export function useMyResumes() {
  const [rawResumes, setRawResumes] = useState<ResumeDocument[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setRawResumes([]);
      setLoading(false);
      setError(null);
      setAuthRequired(true);
      return;
    }

    setLoading(true);
    setError(null);
    setAuthRequired(false);

    try {
      const userResponse = await api.get("/auth/me");
      const currentUser = userResponse.data?.user;

      if (currentUser) {
        setUser({
          id: String(currentUser.id ?? "me"),
          name: currentUser.name ?? "My Account",
          email: currentUser.email ?? "",
          avatar: currentUser.avatar ?? "ME",
          plan: "free",
        });
      }

      const response = await api.get("/resumes");
      const resumes = Array.isArray(response.data?.resumes) ? response.data.resumes : [];
      setRawResumes(resumes);
    } catch (requestError) {
      if (isAuthError(requestError)) {
        localStorage.removeItem("accessToken");
        setAuthRequired(true);
        setRawResumes([]);
        setUser(null);
        setError(null);
      } else {
        setError("Failed to load your resumes. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resumes = useMemo(() => rawResumes.map(mapResumeDocumentToSavedResume), [rawResumes]);

  return {
    user,
    rawResumes,
    resumes,
    loading,
    error,
    authRequired,
    refresh,
  };
}