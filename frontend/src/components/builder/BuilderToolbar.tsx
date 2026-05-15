import React, { useEffect, useState } from "react";
import printResume from "@/utils/print";
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
    <header className="relative z-40 shrink-0 border-b border-zinc-800 bg-[#09090b]/90 font-['Outfit'] backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full flex-wrap items-center gap-2 px-4 py-2 lg:flex-nowrap lg:gap-3 lg:px-6">
        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 transition-all hover:bg-zinc-800 hover:border-zinc-700">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-900">
            <span className="text-[13px] font-bold">R</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Workspace</div>
            <div className="text-[13px] font-semibold tracking-tight text-zinc-100">
              ResumeStudio
            </div>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-zinc-800 lg:block" />

        {editingTitle ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 shadow-sm lg:flex-nowrap">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleCommit();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] font-medium text-zinc-100 outline-none placeholder:text-zinc-500"
            />
            <span className="text-[10px] text-zinc-500">Enter to save</span>
          </div>
        ) : (
          <div className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 transition-all hover:bg-zinc-900">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Resume title</div>
              <div className="truncate text-[13px] font-medium text-zinc-300">{resume.title}</div>
            </div>
            <button
              onClick={() => {
                setTitleDraft(resume.title);
                setEditingTitle(true);
              }}
              title="Rename resume"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:border-zinc-700 hover:text-zinc-100"
            >
              ✎ Rename
            </button>
          </div>
        )}

        {(ui.isDirty || ui.isSaved) && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${ui.isSaved ? "border-zinc-800 bg-zinc-900/50 text-zinc-400" : "border-zinc-800 bg-zinc-900/50 text-zinc-400"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${ui.isSaved ? "bg-emerald-500" : "bg-amber-500"}`} />
            {ui.isSaved ? "Saved" : "Unsaved"}
          </span>
        )}

        <div className="relative shrink-0">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            title={isEditingExistingResume ? "Upgrade this resume to the latest template version" : "Switch template"}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <span className="max-w-37.5 truncate sm:max-w-55">
              {isEditingExistingResume ? `Template: ${currentTemplateLabel}` : currentTemplateLabel}
            </span>
            <span className="text-[9px] text-zinc-500">▼</span>
          </button>

          {showTemplates && (
            <>
              <button type="button" aria-label="Close template menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowTemplates(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-lg border border-zinc-800 bg-[#09090b] shadow-xl">
                <div className="border-b border-zinc-800 bg-zinc-900/30 px-4 py-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Templates
                </div>
                {templatesLoading ? (
                  <div className="px-4 py-4 text-sm text-white/45">Loading templates...</div>
                ) : templates.length > 0 ? (
                  <div className="max-h-[58vh] overflow-y-auto p-2">
                    {isEditingExistingResume && (
                      <div className="mb-2 rounded-xl border border-[#FFFFFF]/15 bg-[#FFFFFF]/7 px-3 py-2 text-xs text-white/55">
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
                                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition ${isCurrentTemplate ? "border-zinc-700 bg-zinc-800 text-zinc-100" : "border-transparent bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-medium">{isCurrentTemplate ? `Current: ${label}` : label}</span>
                                    <span className="block text-[10px] text-zinc-500">{template.status ?? "Template"}</span>
                                  </span>
                                  <span className="ml-3 text-[10px] uppercase tracking-wider text-zinc-600">
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

        <div className="ml-auto hidden h-6 w-px bg-zinc-800 lg:block" />

        <div className="flex w-full flex-1 items-center justify-end gap-2 sm:flex-none lg:w-auto">
          <button
            onClick={() => { void printResume('.resume-preview'); }}
            disabled={!canDownload || isExporting}
            title={isExporting ? (exportStatus ?? "Preparing PDF export") : canDownload ? "Download as PDF" : "Save resume first to enable download"}
            className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Download PDF"}
          </button>

          <button
            onClick={handleSave}
            disabled={ui.isSaving}
            className="inline-flex items-center justify-center rounded-md bg-zinc-100 px-4 py-1.5 text-[12px] font-semibold text-zinc-900 transition hover:bg-white active:scale-95 disabled:opacity-70"
          >
            {ui.isSaving ? "Saving..." : "Save Resume"}
          </button>
        </div>
      </div>
    </header>
  );
}
