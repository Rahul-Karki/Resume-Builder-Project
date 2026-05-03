import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { templates as localTemplateCatalog } from "@/data/templateMeta";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";

type TemplateOption = {
  layoutId: string;
  name: string;
  status?: string;
  sortOrder?: number;
  audience?: "tech" | "non-tech";
};

interface Props {
  onDownload: () => void;
  canDownload: boolean;
  isEditingExistingResume?: boolean;
  isExporting?: boolean;
  exportStatus?: string | null;
}

export function BuilderToolbar({ onDownload, canDownload, isEditingExistingResume = false, isExporting = false, exportStatus = null }: Props) {
  const { resume, ui, saveResume, initFromTemplate, applyTemplateUpgrade, setTitle } = useResumeBuilderStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(resume.title);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 900);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await api.get("/templates");
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const mapped: TemplateOption[] = rows
          .map((row: any) => ({
            layoutId: String(row.layoutId ?? ""),
            name: String(row.name ?? row.layoutId ?? "Template"),
            status: row.status,
            sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
            audience: row.audience === "tech" ? "tech" : "non-tech",
          }))
          .filter((template: TemplateOption) => template.layoutId);

        const mergedByLayoutId = new Map<string, TemplateOption>();
        mapped.forEach((template) => mergedByLayoutId.set(template.layoutId, template));
        localTemplateCatalog.forEach((templateMeta) => {
          if (mergedByLayoutId.has(templateMeta.id)) return;
          mergedByLayoutId.set(templateMeta.id, {
            layoutId: templateMeta.id,
            name: templateMeta.name,
            status: "published",
            sortOrder: 999,
            audience: templateMeta.audience,
          });
        });

        const merged = Array.from(mergedByLayoutId.values());

        if (active) {
          setTemplates(merged.sort((a: TemplateOption, b: TemplateOption) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        }
      } catch {
        if (active) {
          setTemplates([]);
        }
      } finally {
        if (active) {
          setTemplatesLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      active = false;
    };
  }, []);

  const normalizedTemplateId = normalizeResumeTemplateId(resume.templateId);
  const currentTemplateLabel = templates.find((template) => template.layoutId === normalizedTemplateId)?.name
    ?? normalizedTemplateId
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  const groupedTemplates = {
    tech: templates.filter((template) => template.audience === "tech"),
    "non-tech": templates.filter((template) => template.audience !== "tech"),
  };

  const handleSave = async () => {
    await saveResume();
  };

  const handleTitleCommit = () => {
    setTitle(titleDraft || "Untitled Resume");
    setEditingTitle(false);
  };

  return (
    <header style={{
      minHeight: 56, background: "#0F0F0F", borderBottom: "1px solid #1E1E1E",
      display: "flex", alignItems: "center", padding: isMobile ? "8px 10px" : "0 20px", gap: isMobile ? 10 : 16,
      flexWrap: isMobile ? "wrap" : "nowrap",
      fontFamily: "'Outfit', sans-serif", position: "relative", zIndex: 40,
      flexShrink: 0,
    }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#F0EFE8", letterSpacing: "-0.3px", flexShrink: 0 }}>
        Resume<span style={{ color: "#C8F55A" }}>Studio</span>
      </div>

      <div style={{ width: 1, height: 24, background: "#2A2A2A", flexShrink: 0 }} />

      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleCommit}
          onKeyDown={(e) => e.key === "Enter" && handleTitleCommit()}
          style={{
            background: "#1A1A1A", border: "1px solid #3A3A3A", borderRadius: 6,
            color: "#F0EFE8", fontSize: 13, fontWeight: 600, padding: "4px 10px",
            outline: "none", fontFamily: "inherit", width: 200,
          }}
        />
      ) : (
        <button
          onClick={() => {
            setTitleDraft(resume.title);
            setEditingTitle(true);
          }}
          title="Click to rename"
          style={{
            background: "none", border: "none", color: "#888", fontSize: 13,
            fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            padding: "4px 8px", borderRadius: 6, maxWidth: isMobile ? 140 : 200,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            transition: "color 0.15s", opacity: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#F0EFE8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#888";
          }}
        >
          Rename {resume.title}
        </button>
      )}

      {ui.isDirty && !ui.isSaved && (
        <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, flexShrink: 0 }}>Unsaved</span>
      )}
      {ui.isSaved && (
        <span style={{ fontSize: 10, color: "#4ADE80", fontWeight: 600, flexShrink: 0 }}>Saved</span>
      )}

      <div style={{ position: "relative", marginLeft: 4 }}>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          title={isEditingExistingResume ? "Upgrade this resume to the latest template version" : "Switch template"}
          style={{
            background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7,
            color: "#C8C7C0", fontSize: 12, fontWeight: 600, padding: isMobile ? "8px 10px" : "5px 12px",
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {isEditingExistingResume ? `Template: ${currentTemplateLabel}` : currentTemplateLabel}
          <span style={{ fontSize: 10, opacity: 0.5 }}>v</span>
        </button>
        {showTemplates && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowTemplates(false)} />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#161616",
              border: "1px solid #2A2A2A", borderRadius: 10, overflow: "hidden",
              zIndex: 50, minWidth: 200, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            }}>
              {templatesLoading ? (
                <div style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>Loading templates...</div>
              ) : templates.length > 0 ? (
                <>
                  {isEditingExistingResume && (
                    <div style={{ padding: "10px 14px", color: "#666", fontSize: 12, borderBottom: "1px solid #222" }}>
                      Keep your content and apply the latest template defaults.
                    </div>
                  )}
                  {(["non-tech", "tech"] as const).map((groupKey) => (
                    groupedTemplates[groupKey].length > 0 ? (
                      <div key={groupKey}>
                        <div style={{ padding: "8px 14px", color: "#555", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", borderTop: "1px solid #222" }}>
                          {groupKey === "tech" ? "Tech Templates" : "Non-Tech Templates"}
                        </div>
                        {groupedTemplates[groupKey].map((template) => {
                          const isCurrentTemplate = normalizedTemplateId === template.layoutId;
                          const label = isEditingExistingResume
                            ? isCurrentTemplate
                              ? `Refresh ${template.name}`
                              : `Switch to ${template.name}`
                            : template.name;

                          return (
                            <button
                              key={template.layoutId}
                              onClick={() => {
                                if (isEditingExistingResume) {
                                  void applyTemplateUpgrade(template.layoutId);
                                } else {
                                  void initFromTemplate(template.layoutId);
                                }
                                setShowTemplates(false);
                              }}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "9px 14px", background: isCurrentTemplate ? "#222" : "transparent",
                                border: "none", color: isCurrentTemplate ? "#F0EFE8" : "#888",
                                fontSize: 13, fontWeight: isCurrentTemplate ? 700 : 400,
                                cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              {isCurrentTemplate ? "Current: " : ""}{label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null
                  ))}
                </>
              ) : (
                <div style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>No templates found.</div>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: isMobile ? "100%" : "auto" }} />

      {!isMobile && <div style={{ width: 1, height: 24, background: "#2A2A2A" }} />}

      <button
        onClick={onDownload}
        disabled={!canDownload || isExporting}
        title={isExporting ? (exportStatus ?? "Preparing PDF export") : canDownload ? "Download as PDF" : "Save resume first to enable download"}
        style={{
          background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7,
          color: canDownload ? "#C8C7C0" : "#555", fontSize: 13, fontWeight: 600, padding: isMobile ? "10px 14px" : "7px 14px",
          cursor: canDownload && !isExporting ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          flexShrink: 0,
          width: isMobile ? "calc(50% - 5px)" : "auto",
          justifyContent: "center",
          opacity: canDownload && !isExporting ? 1 : 0.7,
        }}
      >
        {isExporting ? "Exporting..." : "Download PDF"}
      </button>

      <button
        onClick={handleSave}
        disabled={ui.isSaving}
        style={{
          background: "#C8F55A", border: "none", borderRadius: 7,
          color: "#0E0E0E", fontSize: 13, fontWeight: 800, padding: isMobile ? "10px 14px" : "7px 18px",
          cursor: ui.isSaving ? "wait" : "pointer", fontFamily: "inherit",
          opacity: ui.isSaving ? 0.7 : 1, flexShrink: 0,
          width: isMobile ? "calc(50% - 5px)" : "auto",
          justifyContent: "center",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {ui.isSaving ? "Saving..." : "Save Resume"}
      </button>
    </header>
  );
}
