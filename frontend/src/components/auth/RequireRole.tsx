import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "../../services/api";

type Props = {
  allowedRoles: string[];
  children: ReactNode;
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
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080808",
          padding: 24,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <style>{`@keyframes guardPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.92; } }`}</style>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div
            style={{
              height: 52,
              borderRadius: 12,
              background: "#141414",
              border: "1px solid #1E1E1E",
              animation: "guardPulse 1.2s ease-in-out infinite",
            }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, marginTop: 18 }}>
            <div
              style={{
                minHeight: 420,
                borderRadius: 14,
                background: "#111111",
                border: "1px solid #1E1E1E",
                animation: "guardPulse 1.2s ease-in-out infinite",
              }}
            />
            <div
              style={{
                minHeight: 420,
                borderRadius: 14,
                background: "#111111",
                border: "1px solid #1E1E1E",
                animation: "guardPulse 1.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return children;
}
