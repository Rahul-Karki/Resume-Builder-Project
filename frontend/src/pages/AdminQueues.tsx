import { useEffect } from "react";
import { getBullBoardUrl } from "@/services/api";

export function AdminQueues() {
  useEffect(() => {
    window.location.replace(getBullBoardUrl());
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080808", color: "#F0EFE8", fontFamily: "'Outfit', sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", border: "1px solid #151515", borderRadius: 18, background: "linear-gradient(180deg, #0C0C0C 0%, #090909 100%)", padding: 24, boxShadow: "0 28px 80px rgba(0, 0, 0, 0.45)" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6F6F6F", marginBottom: 10 }}>
          Queue monitor
        </div>
        <h1 style={{ fontSize: 28, lineHeight: 1.1, margin: 0, fontFamily: "'Fraunces', serif" }}>
          Opening the backend Bull Board.
        </h1>
        <p style={{ marginTop: 12, marginBottom: 18, color: "#A6A6A6", lineHeight: 1.6 }}>
          This view is served by the API server at /admin/queues. It is not rendered inside the React app, so the frontend sends you straight to the backend host.
        </p>
        <a
          href={getBullBoardUrl()}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderRadius: 10, background: "#C8F55A", color: "#080808", textDecoration: "none", fontWeight: 700 }}
        >
          Open Queue Monitor
        </a>
      </div>
    </div>
  );
}