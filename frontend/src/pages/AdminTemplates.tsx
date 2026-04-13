import { useState } from "react";
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
    <div style={{ padding: "28px 32px", fontFamily: "'Outfit', sans-serif", maxWidth: 1400, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
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
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
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
          {["professional", "corporate", "technical", "creative", "academic"].map(c => (
            <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <span style={{ fontSize: 12, color: "#2A2A2A", marginLeft: "auto" }}>
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
            background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ width: "100%", maxWidth: 1040, background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 18, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.75)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #1A1A1A" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EFE8" }}>{previewTarget.name}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{previewTarget.layoutId} · {previewTarget.category}</div>
              </div>
              <button
                onClick={closePreview}
                style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #2A2A2A", background: "#151515", color: "#F0EFE8", cursor: "pointer", fontSize: 18, fontWeight: 700 }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 640 }}>
              <div style={{ padding: 22, borderRight: "1px solid #1A1A1A", background: "#0A0A0A" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#2A2A2A", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Template Details</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <InfoRow label="Status" value={previewTarget.status} />
                  <InfoRow label="Tag" value={previewTarget.tag} />
                  <InfoRow label="Premium" value={previewTarget.isPremium ? "Yes" : "No"} />
                  <InfoRow label="Accent" value={previewTarget.cssVars.accentColor} />
                  <InfoRow label="Body Font" value={previewTarget.cssVars.bodyFont.split(",")[0]} />
                  <InfoRow label="Heading Font" value={previewTarget.cssVars.headingFont.split(",")[0]} />
                </div>
              </div>
              <div style={{ overflow: "auto", background: "#050505", display: "flex", justifyContent: "center", padding: 24 }}>
                <div style={{ width: 794, boxShadow: "0 32px 80px rgba(0,0,0,0.8)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                  <ResumeRenderer resume={buildPreviewResume(previewTarget)} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "#C8C7C0", lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}