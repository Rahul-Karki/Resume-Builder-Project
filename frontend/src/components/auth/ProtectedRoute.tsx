import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/services/api";
import { PageSkeleton } from "@/components/Skeleton";

type Props = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await api.get("/auth/me");
        if (mounted) setAuthenticated(true);
      } catch {
        if (mounted) setAuthenticated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void check();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
