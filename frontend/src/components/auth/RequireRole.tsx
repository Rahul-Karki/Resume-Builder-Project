import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../services/api";

type Props = {
  allowedRoles: string[];
  children: JSX.Element;
};

type MeResponse = {
  user: {
    role?: string;
  };
};

export function RequireRole({ allowedRoles, children }: Props) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const response = await api.get<MeResponse>("/auth/me");
        const role = response.data.user?.role;
        if (!mounted) return;
        setAuthorized(Boolean(role && allowedRoles.includes(role)));
      } catch {
        if (!mounted) return;
        setAuthorized(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [allowedRoles]);

  if (loading) {
    return <div style={{ color: "#B8B8B8", padding: 24 }}>Checking access...</div>;
  }

  if (!authorized) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}
