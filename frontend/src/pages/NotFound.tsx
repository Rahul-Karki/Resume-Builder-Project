import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#F0EFE8", display: "grid", placeItems: "center", padding: 24, fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 300, fontFamily: "'Fraunces', serif" }}>404</h1>
        <p style={{ margin: "10px 0 18px", color: "#A0A0A0", fontSize: 15 }}>Oops! Page not found</p>
        <Link to="/" style={{ color: "#0E0E0E", background: "#C8F55A", borderRadius: 8, textDecoration: "none", padding: "9px 18px", fontWeight: 800, display: "inline-block", fontSize: 13 }}>
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
