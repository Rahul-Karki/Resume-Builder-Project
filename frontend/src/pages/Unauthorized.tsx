import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", display: "grid", placeItems: "center", padding: 24, fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 44 }}>403</h1>
        <p style={{ margin: "10px 0 18px", color: "#a1a1aa" }}>You do not have permission to view this page.</p>
        <Link to="/" style={{ color: "#0F0F0F", background: "#C8F55A", borderRadius: 8, textDecoration: "none", padding: "9px 12px", fontWeight: 800 }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
