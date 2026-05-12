import { Link } from "react-router-dom";

interface LogoProps {
  isCompact?: boolean;
  hideLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Logo({ isCompact = false, hideLabel = false, className = "", style = {} }: LogoProps) {
  const baseStyle: React.CSSProperties = {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    minHeight: isCompact ? 28 : 36,
    padding: "2px 0",
    fontWeight: 800,
    fontSize: isCompact ? 15 : 17,
    letterSpacing: "-0.2px",
    color: "#F0EFE8",
    flexShrink: 0,
    lineHeight: 1,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
    ...style,
  };

  return (
    <Link to="/" style={baseStyle} className={className} title="Go to home page">
      <span>Resume</span>
      <span style={{ color: "#C8F55A" }}>Studio</span>
    </Link>
  );
}
