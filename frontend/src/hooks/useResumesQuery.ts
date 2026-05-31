import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ResumeDocument, SavedResume, User } from "@/types/resume-types";
import { mapResumeDocumentToSavedResume } from "@/hooks/useMyResume";
import { aiCreditsManager } from "@/utils/aiCredits";

export function useMyResumesQuery() {
  return useQuery({
    queryKey: ["my-resumes"],
    queryFn: async (): Promise<{ resumes: SavedResume[]; rawResumes: ResumeDocument[]; user: User | null }> => {
      const userResponse = await api.get("/auth/me");
      const currentUser = userResponse.data?.user;
      let user: User | null = null;

      if (currentUser) {
        aiCreditsManager.syncFromServer(currentUser.aiCredits);
        user = {
          id: String(currentUser.id ?? "me"),
          name: currentUser.name ?? "My Account",
          email: currentUser.email ?? "",
          avatar: currentUser.avatar ?? "ME",
          plan: currentUser.aiCredits?.plan ?? "free",
          aiCredits: currentUser.aiCredits,
        };
      }

      const response = await api.get("/resumes");
      const rawResumes = Array.isArray(response.data?.resumes) ? response.data.resumes : [];
      const resumes = rawResumes.map(mapResumeDocumentToSavedResume);

      return { resumes, rawResumes, user };
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}
