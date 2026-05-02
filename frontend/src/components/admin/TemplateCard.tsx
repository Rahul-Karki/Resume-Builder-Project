import { useState } from "react";
import { AdminTemplate, TemplateStatus } from "../../types/admin.types";

interface Props {
  template:      AdminTemplate;
  onEdit:        (t: AdminTemplate) => void;
  onPreview:     (t: AdminTemplate) => void;
  onSetStatus:   (id: string, status: TemplateStatus) => void;
  onTogglePremium: (id: string) => void;
  onDelete:      (id: string) => void;
  animDelay?:    number;
}

// ─── Mini SVG thumbnail (accent-colored preview) ──────────────────────────────
function MiniThumb({ cssVars }: { cssVars: AdminTemplate["cssVars"] }) {
  const a = cssVars.accentColor;
  const bg = cssVars.backgroundColor ?? "#fff";
  const isSidebar = cssVars.bodyFont?.includes("Nunito");

  if (isSidebar) return (
    <svg viewBox="0 0 120 155" style={{ width: "100%", height: "100%", display: "block", borderRadius: 4 }}>
      <rect width="120" height="155" fill={bg} />
      <rect x="0" y="0" width="36" height="155" fill="#1E293B" />
      {[12,50,88,120].map(y => <rect key={y} x="6" y={y} width="24" height="3" rx="1.5" fill="#475569" opacity="0.5" />)}
      <rect x="42" y="10" width="70" height="8" rx="2" fill={a} opacity="0.75" />
      {[22,30,38,48,56,64,74,82,90,100,108,118,128].map((y,i) => (
        <rect key={y} x="42" y={y} width={[70,60,65,70,55,62,68,55,60,70,58,64,70][i]} height="2" rx="1" fill={a} opacity="0.15" />
      ))}
    </svg>
  );

  return (
    <svg viewBox="0 0 120 155" style={{ width: "100%", height: "100%", display: "block", borderRadius: 4 }}>
      <rect width="120" height="155" fill={bg} />
      <rect x="0" y="0" width="4" height="155" fill={a} opacity="0.25" />
      <rect x="10" y="10" width="65" height="9" rx="2" fill={a} opacity="0.8" />
      <rect x="10" y="23" width="100" height="1.5" fill={a} opacity="0.2" />
      {[30,37,44,54,61,68,78,85,92,102,110,118,128,136].map((y,i) => (
        <rect key={y} x="10" y={y} width={[100,85,95,100,80,90,100,82,90,100,85,93,100,78][i]} height="2" rx="1" fill={a} opacity="0.13" />
      ))}
    </svg>
  );
}

function ThumbnailPreview({ template }: { template: AdminTemplate }) {
  if (template.thumbnailUrl) {
    return (
      <img
        src={template.thumbnailUrl}
        alt={template.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }

  return <MiniThumb cssVars={template.cssVars} />;
}

const STATUS_CONFIG: Record<TemplateStatus, { label: string; bg: string; color: string }> = {
  published: { label: "● Live",   bg: "#0D1A12", color: "#4ADE80" },
  draft:     { label: "○ Draft",  bg: "#1A1A0D", color: "#F59E0B" },
  archived:  { label: "◌ Archived", bg: "#1A0A0A", color: "#F87171" },
};

export function TemplateCard({ template: t, onEdit, onPreview, onSetStatus, onTogglePremium, onDelete, animDelay = 0 }: Props) {
  const [hov, setHov] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sc = STATUS_CONFIG[t.status];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setShowStatusMenu(false); }}
      style={{
        background: "#111", border: `1px solid ${hov ? "#222" : "#191919"}`,
        borderRadius: 14, overflow: "hidden",
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 16px 48px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.2)",
        animation: "cardIn 0.35s ease both",
        animationDelay: `${animDelay}ms`,
        fontFamily: "'Outfit', sans-serif",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 160, background: "#080808", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 18px" }}>
          <div style={{ width: "100%", maxWidth: 110, borderRadius: 4, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", transform: hov ? "scale(1.03)" : "scale(1)", transition: "transform 0.3s" }}>
            <ThumbnailPreview template={t} />
          </div>
        </div>

        {/* Status badge */}
        <div style={{ position: "absolute", top: 9, left: 9, background: sc.bg, color: sc.color, fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>
          {sc.label}
        </div>
        {t.isPremium && (
          <div style={{ position: "absolute", top: 9, right: 9, background: "#92400E", color: "#FCD34D", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20 }}>★ PRO</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 13px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#F0EFE8" }}>{t.name}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {(t.tags?.length ? t.tags : [t.tag]).slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#1A1A1A", color: "#444", border: "1px solid #222", whiteSpace: "nowrap" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#3A3A3A", marginBottom: 8 }}>
          <code style={{ fontFamily: "monospace", fontSize: 10.5, color: "#555" }}>{t.layoutId}</code>
          <span style={{ color: "#252525", margin: "0 5px" }}>·</span>
          <span style={{ textTransform: "capitalize" }}>{t.category}</span>
          <span style={{ color: "#252525", margin: "0 5px" }}>·</span>
          <span>{t.category === "tech" ? "Tech" : "Non-Tech"}</span>
        </div>
        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.45, marginBottom: 12, flex: 1 }}>{t.description || "No description."}</div>

        {/* Color / font info */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: t.cssVars.accentColor, border: "1px solid #252525", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>{t.cssVars.accentColor}</span>
          <span style={{ fontSize: 10, color: "#2A2A2A", marginLeft: 4 }}>{t.cssVars.bodyFont.split(",")[0]}</span>
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 4 }}>
          {/* Preview */}
          <ActionBtn label="Preview" onClick={() => onPreview(t)} />

          {/* Edit */}
          <ActionBtn label="Edit" onClick={() => onEdit(t)} />

          {/* Status menu */}
          <div style={{ position: "relative", flex: 1 }}>
            <ActionBtn
              label={t.status === "published" ? "Unpublish" : "Publish"}
              accent={t.status === "published" ? "#F59E0B" : "#4ADE80"}
              onClick={() => setShowStatusMenu(o => !o)}
            />
            {showStatusMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 48 }} onClick={() => setShowStatusMenu(false)} />
                <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 8, overflow: "hidden", zIndex: 49, minWidth: 130, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
                  {(["published","draft","archived"] as TemplateStatus[]).map(s => (
                    <button key={s} onClick={() => { onSetStatus(t._id, s); setShowStatusMenu(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                        background: t.status === s ? "#1A1A1A" : "transparent",
                        border: "none", color: t.status === s ? "#F0EFE8" : "#555",
                        fontSize: 12, fontWeight: t.status === s ? 700 : 400,
                        cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                      }}>
                      {t.status === s ? "✓ " : ""}{s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Premium toggle */}
          <ActionBtn label={t.isPremium ? "Free" : "Pro"} onClick={() => onTogglePremium(t._id)} />

          {/* Delete */}
          {!showDeleteConfirm
            ? <ActionBtn label="Delete" danger onClick={() => setShowDeleteConfirm(true)} />
            : (
              <div style={{ display: "flex", gap: 3, flex: 1 }}>
                <button onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid #252525", background: "transparent", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  No
                </button>
                <button onClick={() => onDelete(t._id)}
                  style={{ flex: 1, padding: "5px", borderRadius: 6, border: "none", background: "#7F1D1D", color: "#FCA5A5", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Yes
                </button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, danger = false, accent }: { label: string; onClick: () => void; danger?: boolean; accent?: string }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        flex: 1, padding: "5px 4px", borderRadius: 6,
        border: `1px solid ${h ? (danger ? "#7F1D1D" : "#2A2A2A") : "#1E1E1E"}`,
        background: h ? (danger ? "#1A0000" : "#1A1A1A") : "transparent",
        color: h ? (danger ? "#FCA5A5" : (accent ?? "#C8C7C0")) : "#3A3A3A",
        fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}
