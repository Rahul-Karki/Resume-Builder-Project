import { useEffect, useState } from "react";
import { useAdminTemplates } from "../hooks/useAdminTemplate";
import { TemplateCard } from "../components/admin/TemplateCard";
import { TemplateFormModal } from "../components/admin/TemplateFormModal";
import { AdminTemplate, TemplateStatus, TemplateCategory } from "../types/admin.types";
import { ResumeRenderer } from "../templates/ResumeRenderer";
import { sampleData } from "../data/sampleData";
import { ResumeDocument, ResumeStyle, SectionVisibility } from "../types/resume-types";

type FilterStatus = "all" | TemplateStatus;
type FilterCategory = "all" | TemplateCategory;
export function AdminTemplates() {
  const {
    templates, loading, error, toast, saving,
    createTemplate, updateTemplate,
    setStatus, togglePremium, deleteTemplate,
  } = useAdminTemplates();

  const [filterStatus,   setFilterStatus]   = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [search,         setSearch]         = useState("");
  const [modalMode,      setModalMode]      = useState<"create" | "edit" | null>(null);
  const [editTarget,     setEditTarget]     = useState<AdminTemplate | null>(null);
  const [previewTarget,   setPreviewTarget]  = useState<AdminTemplate | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const PREVIEW_PAGE_WIDTH = 794;
  const PREVIEW_PAGE_HEIGHT = 1123;

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        // Mobile: full width - padding
        const availableWidth = window.innerWidth - 32;
        const availableHeight = window.innerHeight - 40;
        const widthScale = availableWidth / PREVIEW_PAGE_WIDTH;
        const heightScale = availableHeight / PREVIEW_PAGE_HEIGHT;
        setPreviewScale(Math.min(0.92, Math.max(0.6, Math.min(widthScale, heightScale))));
      } else {
        // Desktop: modal is max 1440px, minus sidebar (320px), minus padding (48px)
        const modalMaxWidth = 1440;
        const sidebarWidth = 320;
        const modalPaddingX = 48; // 24px on each side
        const previewPaddingX = 48; // 24px on each side
        const overlayPaddingX = 48; // 24px on each side from the overlay
        
        // Actual available width for preview
        const maxAvailableWidth = Math.min(modalMaxWidth, window.innerWidth - overlayPaddingX) - sidebarWidth - previewPaddingX;
        const availableHeight = window.innerHeight - 260; // header + padding
        
        const widthScale = maxAvailableWidth / PREVIEW_PAGE_WIDTH;
        const heightScale = availableHeight / PREVIEW_PAGE_HEIGHT;
        
        setPreviewScale(Math.min(1, Math.max(0.6, Math.min(widthScale, heightScale))));
      }
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const openCreate = () => { setEditTarget(null);   setModalMode("create"); };
  const openEdit   = (t: AdminTemplate) => { setEditTarget(t); setModalMode("edit"); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };
  const closePreview = () => setPreviewTarget(null);

  const buildPreviewResume = (template: AdminTemplate): ResumeDocument => ({
    ...sampleData,
    templateId: template.layoutId,
    style: {
      ...sampleData.style,
      ...template.cssVars,
    } as ResumeStyle,
    sectionVisibility: {
      ...sampleData.sectionVisibility,
      ...template.slots,
    } as SectionVisibility,
  });

  const handleSave = async (form: Parameters<typeof createTemplate>[0]) => {
    if (modalMode === "create") return createTemplate(form);
    if (editTarget) return updateTemplate(editTarget._id, form);
    return false;
  };

  // ── Filter + search ────────────────────────────────────────────────────────
  const filtered = templates
    .filter(t => filterStatus   === "all" || t.status   === filterStatus)
    .filter(t => filterCategory === "all" || t.category === filterCategory)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.layoutId.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:       templates.length,
    published: templates.filter(t => t.status === "published").length,
    draft:     templates.filter(t => t.status === "draft").length,
    archived:  templates.filter(t => t.status === "archived").length,
  };

  return (
    <div style={{ padding: isMobile ? "20px 12px" : "28px 32px", fontFamily: "'Outfit', sans-serif", maxWidth: 1400, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 300, color: "#F0EFE8", letterSpacing: "-0.5px", margin: 0, marginBottom: 4 }}>
            Templates
          </h1>
          <p style={{ fontSize: 12, color: "#444", margin: 0 }}>
            {templates.length} total · {counts.published} published · {counts.draft} draft
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: "9px 22px", borderRadius: 9, border: "none",
            background: "#C8F55A", color: "#0E0E0E", fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          + Add Template
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: isMobile ? "100%" : 280, width: isMobile ? "100%" : "auto" }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#333", pointerEvents: "none" }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
            style={{ width: "100%", padding: "7px 12px 7px 30px", background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, color: "#C8C7C0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.currentTarget.style.borderColor = "#2A2A2A"}
            onBlur={e => e.currentTarget.style.borderColor = "#1A1A1A"}
          />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 14 }}>×</button>}
        </div>

        {/* Status filter pills */}
        {(["all", "published", "draft", "archived"] as FilterStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: "5px 14px", borderRadius: 20, border: "1px solid",
            borderColor: filterStatus === s ? "#C8F55A" : "#1E1E1E",
            background: filterStatus === s ? "rgba(200,245,90,0.1)" : "transparent",
            color: filterStatus === s ? "#C8F55A" : "#444",
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s", textTransform: "capitalize",
          }}>
            {s === "all" ? `All (${counts.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts] ?? 0})`}
          </button>
        ))}

        {/* Category filter */}
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as FilterCategory)}
          style={{ padding: "6px 10px", background: "#111", border: "1px solid #1A1A1A", borderRadius: 8, color: "#666", fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          <option value="all">All Categories</option>
          <option value="non-tech">Non-Tech</option>
          <option value="tech">Tech</option>
        </select>

        <span style={{ fontSize: 12, color: "#2A2A2A", marginLeft: isMobile ? 0 : "auto" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: "#111", borderRadius: 14, overflow: "hidden", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 100}ms` }}>
              <div style={{ height: 160, background: "#0A0A0A" }} />
              <div style={{ padding: "12px 14px" }}>
                <div style={{ height: 14, background: "#1A1A1A", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 11, background: "#141414", borderRadius: 4, width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "16px 20px", background: "#1A0000", border: "1px solid #3A0000", borderRadius: 10, color: "#F87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        filtered.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {filtered.map((t, i) => (
              <TemplateCard
                key={t._id}
                template={t}
                animDelay={i * 40}
                onEdit={openEdit}
                onPreview={setPreviewTarget}
                onSetStatus={setStatus}
                onTogglePremium={togglePremium}
                onDelete={deleteTemplate}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 6 }}>
              {search ? `No templates match "${search}"` : "No templates found"}
            </div>
            <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); }}
              style={{ background: "none", border: "none", color: "#444", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
              Clear filters
            </button>
          </div>
        )
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <TemplateFormModal
          mode={modalMode}
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {/* Preview Modal */}
      {previewTarget && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closePreview(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 180,
            background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: isMobile ? 10 : 24,
            overflow: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: 1440, height: isMobile ? "calc(100vh - 20px)" : "calc(100vh - 48px)", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)", marginTop: isMobile ? 0 : 8, display: "flex", flexDirection: "column" }}>
            {/* Header with gradient background */}
            <div style={{ background: "linear-gradient(135deg, rgba(200,245,90,0.08) 0%, rgba(200,245,90,0.02) 100%), #0D0D0D", borderBottom: "1.5px solid #1E1E1E", display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 12px" : "24px 28px", position: "sticky", top: 0, zIndex: 10, gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#F0EFE8", letterSpacing: "-0.5px" }}>{previewTarget.name}</div>
                <div style={{ fontSize: 12, color: "#8AA0FF", marginTop: 6, fontWeight: 500 }}>
                  <span style={{ color: "#444" }}>layoutId: </span>{previewTarget.layoutId} · <span style={{ color: "#444" }}>Category: </span>{previewTarget.category} · <span style={{ color: "#444" }}>Tags: </span>{(previewTarget.tags?.length ? previewTarget.tags : [previewTarget.tag]).join(", ")}
                </div>
              </div>
              <button
                onClick={closePreview}
                onMouseEnter={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.transform = "scale(1.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#151515"; e.currentTarget.style.transform = "scale(1)"; }}
                style={{ width: 38, height: 38, borderRadius: 12, border: "1.5px solid #2A2A2A", background: "#151515", color: "#F0EFE8", cursor: "pointer", fontSize: 20, fontWeight: 700, transition: "all 0.2s ease" }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px minmax(0, 1fr)", minHeight: 0, flex: 1 }}>
              {/* Sidebar */}
              <div style={{ padding: isMobile ? 14 : 28, borderRight: isMobile ? "none" : "1.5px solid #1A1A1A", borderBottom: isMobile ? "1.5px solid #1A1A1A" : "none", background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)", overflow: "auto", minHeight: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#C8F55A", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 20 }}>✨ Template Details</div>
                <div style={{ display: "grid", gap: 16 }}>
                  <InfoRow label="Status" value={previewTarget.status} />
                  <InfoRow label="Tag" value={previewTarget.tag} />
                  <InfoRow label="Tags" value={(previewTarget.tags?.length ? previewTarget.tags : [previewTarget.tag]).join(", ")} />
                  <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: 16 }} />
                  <InfoRow label="Premium" value={previewTarget.isPremium ? "✓ Yes" : "No"} isHighlight={previewTarget.isPremium} />
                  <InfoRow label="Thumbnail" value={previewTarget.thumbnailUrl ? "Custom image" : "Generated preview"} />
                  <InfoRow label="Accent Color" value={previewTarget.cssVars.accentColor} showColor={previewTarget.cssVars.accentColor} />
                  <InfoRow label="Body Font" value={previewTarget.cssVars.bodyFont.split(",")[0]} />
                  <InfoRow label="Heading Font" value={previewTarget.cssVars.headingFont.split(",")[0]} />
                </div>
              </div>
              {/* Preview */}
              <div style={{ overflow: "auto", background: "linear-gradient(135deg, #080808 0%, #050505 100%)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: isMobile ? 12 : 24, minHeight: 0 }}>
                <div style={{ width: PREVIEW_PAGE_WIDTH * previewScale, height: PREVIEW_PAGE_HEIGHT * previewScale, flexShrink: 0 }}>
                  <div data-testid="admin-template-preview-canvas" style={{ width: PREVIEW_PAGE_WIDTH, height: PREVIEW_PAGE_HEIGHT, transform: `scale(${previewScale})`, transformOrigin: "top center", boxShadow: "0 40px 100px rgba(0,0,0,0.9), inset 0 0 1px rgba(200,245,90,0.1)", borderRadius: 12, overflow: "hidden", background: "#fff", border: "1px solid rgba(200,245,90,0.05)" }}>
                    <ResumeRenderer resume={buildPreviewResume(previewTarget)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "#1A0000" : "#161616",
          color: toast.type === "error" ? "#F87171" : "#F0EFE8",
          padding: "10px 22px", borderRadius: 24, fontSize: 13, fontWeight: 600,
          border: `1px solid ${toast.type === "error" ? "#3A0000" : "#2A2A2A"}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 200,
          fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 8,
          animation: "toastIn 0.2s ease", whiteSpace: "nowrap",
        }}>
          <span style={{ fontSize: 14 }}>{toast.type === "error" ? "✕" : "✓"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, isHighlight = false, showColor }: { label: string; value: string; isHighlight?: boolean; showColor?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: isHighlight ? "#C8F55A" : "#888", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {showColor && (
          <div style={{ width: 20, height: 20, borderRadius: 6, background: showColor, border: "1.5px solid #2A2A2A", boxShadow: `0 0 12px ${showColor}33` }} />
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: isHighlight ? "#4ADE80" : "#E8E8E8", fontFamily: showColor ? "monospace" : "inherit" }}>{value}</div>
      </div>
    </div>
  );
}
