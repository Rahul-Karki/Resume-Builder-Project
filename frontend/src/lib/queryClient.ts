import { QueryClient } from "@tanstack/react-query";

const STALE_TIMES = {
  dashboard: 30 * 1000,
  analytics: 60 * 1000,
  templates: 120 * 1000,
  resumes: 30 * 1000,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: STALE_TIMES.dashboard,
    },
  },
});

export { STALE_TIMES };
