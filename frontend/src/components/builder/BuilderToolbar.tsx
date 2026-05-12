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
    <header className="relative z-40 shrink-0 border-b border-white/8 bg-[linear-gradient(180deg,rgba(13,13,13,0.98),rgba(9,9,9,0.94))] font-['Outfit'] backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 max-w-450 flex-wrap items-center gap-2 px-3 py-3 lg:flex-nowrap lg:gap-3 lg:px-5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/6 bg-white/3 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c8f55a]/12 text-[#c8f55a] ring-1 ring-[#c8f55a]/20">
            <span className="text-sm font-black">R</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Workspace</div>
            <div className="text-sm font-semibold tracking-tight text-white">
              Resume<span className="text-[#c8f55a]">Studio</span>
            </div>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-white/10 lg:block" />

        {editingTitle ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-2xl border border-white/6 bg-white/2 px-3 py-2 lg:flex-nowrap">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleCommit();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="min-w-0 flex-1 rounded-xl border border-[#c8f55a]/20 bg-[#111111] px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#c8f55a]/50"
            />
            <span className="text-[10px] font-medium text-white/35">Enter to save</span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/6 bg-white/2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Resume title</div>
              <div className="truncate text-sm font-semibold text-white/95">{resume.title}</div>
            </div>
            <button
              onClick={() => {
                setTitleDraft(resume.title);
                setEditingTitle(true);
              }}
              title="Rename resume"
              className="inline-flex items-center gap-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-medium text-white/60 transition hover:border-[#c8f55a]/40 hover:bg-[#c8f55a]/8 hover:text-[#c8f55a]"
            >
              ✎
              <span className="hidden sm:inline">Rename</span>
            </button>
          </div>
        )}

        {(ui.isDirty || ui.isSaved) && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${ui.isSaved ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${ui.isSaved ? "bg-emerald-300" : "bg-amber-300"}`} />
            {ui.isSaved ? "Saved" : "Unsaved"}
          </span>
        )}

        <div className="relative shrink-0">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            title={isEditingExistingResume ? "Upgrade this resume to the latest template version" : "Switch template"}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[#c8f55a]/35 hover:bg-[#c8f55a]/8 hover:text-white"
          >
            <span className="max-w-37.5 truncate sm:max-w-55">
              {isEditingExistingResume ? `Template: ${currentTemplateLabel}` : currentTemplateLabel}
            </span>
            <span className="text-[10px] text-white/35">▼</span>
          </button>

          {showTemplates && (
            <>
              <button type="button" aria-label="Close template menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowTemplates(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-white/8 bg-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                <div className="border-b border-white/6 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Templates
                </div>
                {templatesLoading ? (
                  <div className="px-4 py-4 text-sm text-white/45">Loading templates...</div>
                ) : templates.length > 0 ? (
                  <div className="max-h-[58vh] overflow-y-auto p-2">
                    {isEditingExistingResume && (
                      <div className="mb-2 rounded-xl border border-[#c8f55a]/15 bg-[#c8f55a]/7 px-3 py-2 text-xs text-white/55">
                        Keep your content and apply the latest template defaults.
                      </div>
                    )}

                    {(["non-tech", "tech"] as const).map((groupKey) =>
                      groupedTemplates[groupKey].length > 0 ? (
                        <div key={groupKey} className="mb-2 last:mb-0">
                          <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                            {groupKey === "tech" ? "Tech Templates" : "Non-Tech Templates"}
                          </div>
                          <div className="space-y-1">
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
                                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${isCurrentTemplate ? "border-[#c8f55a]/25 bg-[#c8f55a]/10 text-white" : "border-white/6 bg-white/2 text-white/70 hover:border-[#c8f55a]/20 hover:bg-white/5 hover:text-white"}`}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">{isCurrentTemplate ? `Current: ${label}` : label}</span>
                                    <span className="block text-[10px] text-white/35">{template.status ?? "Template"}</span>
                                  </span>
                                  <span className="ml-3 text-[10px] uppercase tracking-[0.18em] text-white/30">
                                    {template.audience === "tech" ? "Tech" : "General"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-white/45">No templates found.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto hidden h-8 w-px bg-white/10 lg:block" />

        <div className="flex w-full flex-1 items-center justify-end gap-2 sm:flex-none lg:w-auto">
          <button
            onClick={onDownload}
            disabled={!canDownload || isExporting}
            title={isExporting ? (exportStatus ?? "Preparing PDF export") : canDownload ? "Download as PDF" : "Save resume first to enable download"}
            className="inline-flex min-w-31 items-center justify-center rounded-2xl border border-white/8 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-[#c8f55a]/35 hover:bg-[#c8f55a]/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Download PDF"}
          </button>

          <button
            onClick={handleSave}
            disabled={ui.isSaving}
            className="inline-flex min-w-29.5 items-center justify-center rounded-2xl bg-[#c8f55a] px-4 py-2 text-sm font-extrabold text-[#0e0e0e] transition hover:bg-[#d7fa74] disabled:cursor-wait disabled:opacity-70"
          >
            {ui.isSaving ? "Saving..." : "Save Resume"}
          </button>
        </div>
      </div>
    </header>
  );
}
