import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { ResumeDocument, ResumeStyle, SectionVisibility } from "@/types/resume-types";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { sampleData } from "@/data/sampleData";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { api } from "@/services/api";
import { TemplateMeta, templates as localTemplateCatalog } from "@/data/templateMeta";
import { ThumbnailSVG } from "./ThumbnailSVG";

type SlotKey = "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";

const SLOT_FALLBACK_SECTIONS: ResumeDocument["sections"] = {
  experience: sampleData.sections.experience,
  education: sampleData.sections.education,
  skills: sampleData.sections.skills,
  projects: sampleData.sections.projects,
  certifications: sampleData.sections.certifications,
  languages: sampleData.sections.languages.length
    ? sampleData.sections.languages
    : [
        { id: "lang-1", language: "English", proficiency: "Native" },
        { id: "lang-2", language: "Spanish", proficiency: "Intermediate" },
      ],
};

const PAGE_SIZE = 24;

const mergeWithLocalTemplateCatalog = (apiTemplates: TemplateMeta[]): TemplateMeta[] => {
  const byId = new Map<string, TemplateMeta>();
  apiTemplates.forEach((template) => byId.set(template.id, template));

  localTemplateCatalog.forEach((template) => {
    if (byId.has(template.id)) return;

    byId.set(template.id, {
      id: template.id,
      name: template.name,
      tag: template.tag,
      category: template.category,
      audience: template.audience,
      accent: template.accent,
      font: template.font,
      description: template.description,
      isPremium: template.isPremium,
      palette: template.palette,
      cssVars: template.cssVars,
      slots: template.slots,
    });
  });

  return Array.from(byId.values());
};

const enrichWithLocalTemplateCatalog = (apiTemplates: TemplateMeta[]): TemplateMeta[] => {
  const localById = new Map(localTemplateCatalog.map((template) => [template.id, template]));

  return apiTemplates.map((template) => {
    const local = localById.get(template.id);
    if (!local) return template;
    return {
      ...local,
      ...template,
      cssVars: { ...local.cssVars, ...template.cssVars },
      slots: { ...local.slots, ...template.slots },
    };
  });
};

const resolveTemplateThumbnailUrl = (rawUrl?: string) => {
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const cdnBase = String(import.meta.env.VITE_CDN_BASE_URL ?? "").trim();
  if (!cdnBase) return rawUrl;
  const cleanBase = cdnBase.replace(/\/+$/, "");
  const cleanPath = rawUrl.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
};

const buildPreviewSample = (template: TemplateMeta): ResumeDocument => {
  const stylePatch = template.cssVars ?? {};
  const slotsPatch = template.slots ?? {};
  const socialPatch = template.category === "tech"
    ? {
        github: "https://github.com/maya-thompson",
        portfolio: "https://maya-thompson.dev",
      }
    : {};

  const slotState: Record<SlotKey, boolean> = {
    summary: slotsPatch.summary ?? true,
    experience: slotsPatch.experience ?? sampleData.sectionVisibility.experience,
    education: slotsPatch.education ?? sampleData.sectionVisibility.education,
    skills: slotsPatch.skills ?? sampleData.sectionVisibility.skills,
    projects: slotsPatch.projects ?? sampleData.sectionVisibility.projects,
    certifications: slotsPatch.certifications ?? sampleData.sectionVisibility.certifications,
    languages: slotsPatch.languages ?? sampleData.sectionVisibility.languages,
  };

  return {
    ...sampleData,
    templateId: template.id,
    personalInfo: {
      ...sampleData.personalInfo,
      ...socialPatch,
      summary: slotState.summary ? sampleData.personalInfo.summary : "",
    },
    sections: {
      experience: slotState.experience ? SLOT_FALLBACK_SECTIONS.experience : [],
      education: slotState.education ? SLOT_FALLBACK_SECTIONS.education : [],
      skills: slotState.skills ? SLOT_FALLBACK_SECTIONS.skills : [],
      projects: slotState.projects ? SLOT_FALLBACK_SECTIONS.projects : [],
      certifications: slotState.certifications ? SLOT_FALLBACK_SECTIONS.certifications : [],
      languages: slotState.languages ? SLOT_FALLBACK_SECTIONS.languages : [],
    },
    style: {
      ...sampleData.style,
      ...stylePatch,
    } as ResumeStyle,
    sectionVisibility: {
      ...sampleData.sectionVisibility,
      experience: slotState.experience,
      education: slotState.education,
      skills: slotState.skills,
      projects: slotState.projects,
      certifications: slotState.certifications,
      languages: slotState.languages,
    } as SectionVisibility,
  };
};

const css = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&family=Outfit:wght@300;400;500;600;700&family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #0E0E0E; }
 
    .tp-root { font-family: 'Outfit', sans-serif; background: #0E0E0E; color: #F0EFE8; min-height: 100vh; }
 
    /* NAV */
    .tp-nav { position: sticky; top: 0; z-index: 50; padding: 0 40px; height: 64px; display: flex; align-items: center; justify-content: flex-start; gap: 36px; transition: all 0.3s; }
    .tp-nav.scrolled { background: rgba(14,14,14,0.95); border-bottom: 1px solid #1F1F1F; backdrop-filter: blur(12px); }
    .tp-logo { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 500; color: #F0EFE8; letter-spacing: -0.5px; }
    .tp-logo em { font-style: italic; color: #C8F55A; }
    .tp-nav-links { display: flex; align-items: center; gap: 22px; }
    .tp-nav-link { font-size: 13px; color: #888; font-weight: 400; cursor: pointer; transition: color 0.2s; }
    .tp-nav-link:hover, .tp-nav-link.active { color: #F0EFE8; }
    .tp-nav-cta { padding: 8px 20px; background: #C8F55A; color: #0E0E0E; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.2s; }
    .tp-nav-cta:hover { opacity: 0.88; }
 
    /* HERO */
    .tp-hero { padding: 80px 40px 60px; max-width: 900px; margin: 0 auto; text-align: center; }
    .tp-hero-badge { display: inline-flex; align-items: center; gap: 6px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 24px; padding: 5px 14px; font-size: 11px; font-weight: 600; color: #C8F55A; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 24px; }
    .tp-hero-h1 { font-family: 'Fraunces', serif; font-size: clamp(42px, 6vw, 72px); font-weight: 300; line-height: 1.08; letter-spacing: -2px; color: #F0EFE8; margin-bottom: 20px; }
    .tp-hero-h1 em { font-style: italic; color: #C8F55A; }
    .tp-hero-sub { font-size: 16px; color: #666; font-weight: 300; line-height: 1.6; max-width: 520px; margin: 0 auto 36px; }
    .tp-hero-pills { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .tp-pill { display: flex; align-items: center; gap: 6px; background: #161616; border: 1px solid #222; border-radius: 24px; padding: 6px 14px; font-size: 12px; color: #888; }
    .tp-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #C8F55A; }
 
    /* FILTER */
    .tp-filter { padding: 0 40px 36px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .tp-filter-btn { padding: 8px 20px; border-radius: 100px; border: 1px solid #222; background: transparent; color: #666; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .tp-filter-btn:hover { border-color: #444; color: #ccc; }
    .tp-filter-btn.active { background: #F0EFE8; color: #0E0E0E; border-color: #F0EFE8; font-weight: 700; }
 
    /* GRID */
    .tp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; padding: 0 40px 80px; max-width: 1400px; margin: 0 auto; }
    .tp-card { border-radius: 16px; overflow: hidden; background: #141414; border: 1px solid #1F1F1F; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; animation: fadein 0.5s ease both; content-visibility: auto; contain-intrinsic-size: 420px; }
    .tp-card:hover { border-color: #333; transform: translateY(-4px); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
    @keyframes fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
 
    .tp-card-thumb { position: relative; height: 320px; overflow: hidden; background: #0A0A0A; }
    .tp-card-thumb-inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .tp-card-thumb-paper { width: 100%; max-width: 220px; border-radius: 6px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.6); transform: scale(0.96); transition: transform 0.4s cubic-bezier(0.4,0,0.2,1); }
    .tp-card:hover .tp-card-thumb-paper { transform: scale(1.02); }
    .tp-card-hover-overlay { position: absolute; inset: 0; background: rgba(14,14,14,0.0); display: flex; align-items: center; justify-content: center; transition: background 0.3s; }
    .tp-card:hover .tp-card-hover-overlay { background: rgba(14,14,14,0.55); }
    .tp-card-preview-btn { opacity: 0; transform: translateY(8px) scale(0.95); transition: all 0.25s; background: #F0EFE8; color: #0E0E0E; border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .tp-card:hover .tp-card-preview-btn { opacity: 1; transform: translateY(0) scale(1); }
    .tp-card-premium-badge { position: absolute; top: 14px; left: 14px; background: #F59E0B; color: #0E0E0E; font-size: 9.5px; font-weight: 800; padding: "3px 10px"; border-radius: 20px; letter-spacing: 0.5px; }
    .tp-card-body { padding: 18px 20px 20px; border-top: 1px solid #1F1F1F; }
    .tp-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
    .tp-card-name { font-size: 16px; font-weight: 700; color: #F0EFE8; }
    .tp-card-tag { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #1A1A1A; color: #888; border: 1px solid #252525; letter-spacing: 0.3px; }
    .tp-card-desc { font-size: 12.5px; color: #555; line-height: 1.5; margin-bottom: 14px; }
    .tp-card-footer { display: flex; align-items: center; justify-content: space-between; }
    .tp-card-accent { display: flex; align-items: center; gap: 7px; }
    .tp-card-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid #2A2A2A; }
    .tp-card-font { font-size: 11px; color: #555; }
    .tp-card-use-btn { font-size: 12px; font-weight: 600; color: #C8F55A; background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; transition: opacity 0.2s; }
    .tp-card-use-btn:hover { opacity: 0.75; }
 
    /* MODAL */
    .tp-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.88); display: flex; flex-direction: column; animation: fadein 0.2s ease; backdrop-filter: blur(4px); }
    .tp-modal-topbar { flex-shrink: 0; min-height: 68px; background: #0E0E0E; border-bottom: 1px solid #1F1F1F; display: flex; align-items: center; justify-content: space-between; padding: 8px 32px; gap: 12px; flex-wrap: wrap; }
    .tp-modal-info { display: flex; align-items: center; gap: 14px; }
    .tp-modal-name { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; color: #F0EFE8; }
    .tp-modal-category { font-size: 11px; font-weight: 600; color: #666; background: #1A1A1A; border: 1px solid #252525; padding: "3px 10px"; border-radius: 20px; }
    .tp-modal-actions { display: flex; align-items: center; gap: 12px; }
    .tp-modal-close { width: 36px; height: 36px; border-radius: 8px; background: #1A1A1A; border: 1px solid #252525; color: #888; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .tp-modal-close:hover { background: #222; color: #F0EFE8; }
    .tp-modal-use-btn { padding: "10px 24px"; background: #C8F55A; color: #0E0E0E; border: none; border-radius: 10px; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 8px; transition: opacity 0.2s; }
    .tp-modal-use-btn:hover { opacity: 0.88; }
    .tp-modal-scroll { flex: 1; overflow-y: auto; background: #F5F4F0; min-height: 0; }
    .tp-modal-paper { width: min(900px, calc(100% - 24px)); max-width: 900px; margin: 24px auto; border-radius: 8px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.4); }
    .tp-modal-bottom-padding { height: 60px; }
 
    /* ATS section */
    .tp-ats { background: #111; border-top: 1px solid #1A1A1A; padding: 60px 40px; text-align: center; }
    .tp-ats-h2 { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 300; color: #F0EFE8; margin-bottom: 14px; }
    .tp-ats-sub { font-size: 14px; color: #555; margin-bottom: 36px; }
    .tp-ats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 720px; margin: 0 auto; }
    .tp-ats-card { background: #161616; border: 1px solid #1F1F1F; border-radius: 12px; padding: 24px; text-align: left; }
    .tp-ats-icon { font-size: 22px; margin-bottom: 12px; }
    .tp-ats-card-title { font-size: 14px; font-weight: 600; color: #F0EFE8; margin-bottom: 6px; }
    .tp-ats-card-body { font-size: 12px; color: #555; line-height: 1.6; }
 
    /* Template nav strip in modal */
    .tp-modal-nav { display: flex; gap: 6px; flex-wrap: wrap; max-width: 100%; }
    .tp-modal-nav-btn { padding: "5px 14px"; border-radius: 20px; border: 1px solid #252525; background: #161616; color: #666; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
    .tp-modal-nav-btn.active { background: #F0EFE8; color: #0E0E0E; border-color: #F0EFE8; }
    .tp-modal-nav-btn:hover:not(.active) { border-color: #444; color: #ccc; }

    /* Loading skeleton */
    @keyframes tp-pulse {
      0% { opacity: 0.45; }
      50% { opacity: 0.95; }
      100% { opacity: 0.45; }
    }
    .tp-skeleton {
      background: #1A1A1A;
      border: 1px solid #252525;
      border-radius: 8px;
      animation: tp-pulse 1.2s ease-in-out infinite;
    }
 
    @media (max-width: 1024px) {
      .tp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 24px 64px; gap: 18px; }
      .tp-hero { padding: 66px 24px 44px; }
      .tp-nav { padding: 0 24px; }
      .tp-filter { padding: 0 24px 30px; }
      .tp-modal-topbar { padding: 10px 20px; }
      .tp-modal-paper { width: min(900px, calc(100% - 20px)); }
    }

    @media (max-width: 768px) {
      .tp-grid { grid-template-columns: 1fr; padding: 0 20px 60px; gap: 16px; }
      .tp-hero { padding: 60px 20px 40px; }
      .tp-nav { padding: 0 20px; }
      .tp-filter { padding: 0 20px 28px; }
      .tp-ats-grid { grid-template-columns: 1fr; }
      .tp-modal-topbar { padding: 10px 16px; align-items: flex-start; }
      .tp-modal-nav { width: 100%; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; }
      .tp-modal-nav-btn { flex-shrink: 0; }
      .tp-modal-actions { width: 100%; justify-content: space-between; }
      .tp-modal-use-btn { width: 100%; justify-content: center; }
      .tp-modal-paper { width: calc(100% - 12px); margin: 12px auto; border-radius: 6px; }
    }

    @media (max-width: 480px) {
      .tp-nav { height: auto; min-height: 56px; padding: 8px 12px; gap: 14px; }
      .tp-nav-links { gap: 12px; }
      .tp-nav-cta { width: 100%; text-align: center; }
      .tp-hero-h1 { letter-spacing: -1.3px; }
      .tp-card-thumb { height: 280px; }
    }`
 
// ═══════════════════════════════════════════════════════════════
// MAIN TEMPLATES PAGE
// ═══════════════════════════════════════════════════════════════
export default function TemplatesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const skeletonItems = Array.from({ length: 6 }, (_, index) => index);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading templates...");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeAudience, setActiveAudience] = useState<"All" | "Tech" | "Non-Tech">("All");
  const [previewId, setPreviewId] = useState<string | null>(() => searchParams.get("preview"));
  const [activePreviewId, setActivePreviewId] = useState<string | null>(() => searchParams.get("preview"));
  const [isPreviewSwitching, setIsPreviewSwitching] = useState<boolean>(() => Boolean(searchParams.get("preview")));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const initialPreviewParam = searchParams.get("preview");
  const previewSwitchTimerRef = useRef<number | null>(null);
  const previewSwitchRafRef = useRef<number | null>(null);
 
  const previewTemplate = templates.find(t => t.id === activePreviewId);
  const previewSample = useMemo(() => {
    if (!previewTemplate) return null;
    return buildPreviewSample(previewTemplate);
  }, [previewTemplate]);

  const clearPreviewSwitchHandles = () => {
    if (previewSwitchRafRef.current !== null) {
      window.cancelAnimationFrame(previewSwitchRafRef.current);
      previewSwitchRafRef.current = null;
    }
    if (previewSwitchTimerRef.current !== null) {
      window.clearTimeout(previewSwitchTimerRef.current);
      previewSwitchTimerRef.current = null;
    }
  };

  const fetchTemplatesWithRetry = async (nextPage: number, audience?: "tech" | "non-tech") => {
    const retryDelaysMs = [0, 1500, 3000, 5000];
    let lastError: unknown = null;

    for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
      if (attempt === 0) {
        setLoadingMessage("Loading templates...");
      } else {
        setLoadingMessage(`Server is waking up... retrying (${attempt}/${retryDelaysMs.length - 1})`);
      }

      if (retryDelaysMs[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
      }

      try {
        const response = await api.get("/templates", {
          timeout: 35000,
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            ...(audience ? { audience } : {}),
          },
        });

        const payload = response?.data?.data ?? response?.data;
        const rows = Array.isArray(payload?.templates)
          ? payload.templates
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        const mapped: TemplateMeta[] = rows.map((row: any) => {
          const category = row.category === "tech" || row.audience === "tech" ? "tech" : "non-tech";
          const accent = row.cssVars?.accentColor ?? "#1a1a1a";
          const font = String(row.cssVars?.bodyFont ?? "Outfit").split(",")[0].trim();
          const rawThumbnail = typeof row.thumbnailUrl === "string" ? row.thumbnailUrl : "";

          return {
            id: row.layoutId,
            name: row.name ?? row.layoutId,
            tag: row.tag ?? "General",
            category,
            audience: row.audience === "tech" ? "tech" : "non-tech",
            accent,
            font,
            description: row.description ?? "",
            isPremium: Boolean(row.isPremium),
            thumbnailUrl: resolveTemplateThumbnailUrl(rawThumbnail),
            palette: [
              row.cssVars?.backgroundColor ?? "#ffffff",
              accent,
              row.cssVars?.textColor ?? "#333333",
            ],
            cssVars: row.cssVars ?? {},
            slots: row.slots ?? {},
          };
        });

        return {
          templates: enrichWithLocalTemplateCatalog(mapped),
          page: Number(payload?.page ?? nextPage),
          totalPages: Number(payload?.totalPages ?? 1),
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const loadTemplatesData = async (reset = false) => {
    const nextPage = reset ? 1 : page + 1;
    const audience = activeAudience === "All"
      ? undefined
      : activeAudience === "Tech" ? "tech" : "non-tech";

    if (reset) {
      setLoadingTemplates(true);
      setLoadingMessage("Loading templates...");
      setLoadError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await fetchTemplatesWithRetry(nextPage, audience);
      setTotalPages(result.totalPages);
      setPage(result.page);
      setTemplates((prev) => {
        if (reset) return result.templates;
        const existing = new Set(prev.map((template) => template.id));
        const combined = [...prev, ...result.templates.filter((template) => !existing.has(template.id))];
        return combined;
      });
    } catch {
      if (reset) {
        // If API fails completely, fall back to local templates
        setLoadError("Could not load public templates from the database. The server may be waking up (cold start). Please retry in a few seconds.");
        setTemplates(mergeWithLocalTemplateCatalog([]));
        setPage(1);
        setTotalPages(1);
      }
    } finally {
      if (reset) {
        setLoadingTemplates(false);
      }
      setIsLoadingMore(false);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    const token = localStorage.getItem("accessToken");
    const destination = `/builder?template=${templateId}`;

    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }

    navigate(destination);
  };

  const handlePreviewSelect = (templateId: string) => {
    if (templateId === previewId) return;

    clearPreviewSwitchHandles();
    setIsPreviewSwitching(true);
    setActivePreviewId(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preview", templateId);
    setSearchParams(nextParams, { replace: true });
    setPreviewId(templateId);
  };
 
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!active) return;
      await loadTemplatesData(true);
    })();

    return () => {
      active = false;
    };
  }, [activeAudience]);
 
  useEffect(() => {
    if (previewId) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [previewId]);

  useEffect(() => {
    if (templates.length === 0) return;

    // Keep modal selection synchronized with URL changes.
    if (!initialPreviewParam) {
      if (previewId) setPreviewId(null);
      return;
    }

    const hasTemplate = templates.some((template) => template.id === initialPreviewParam);
    if (hasTemplate && previewId !== initialPreviewParam) {
      setPreviewId(initialPreviewParam);
    }
  }, [initialPreviewParam, previewId, templates]);

  useEffect(() => {
    if (!previewId || loadingTemplates || templates.length === 0) return;

    const hasPreviewTemplate = templates.some((template) => template.id === previewId);
    if (hasPreviewTemplate) return;

    // Selected template was removed or unpublished; clear stale modal state and URL param.
    setPreviewId(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("preview");
    setSearchParams(nextParams, { replace: true });
  }, [loadingTemplates, previewId, searchParams, setSearchParams, templates]);

  useEffect(() => {
    clearPreviewSwitchHandles();

    if (!previewId) {
      setActivePreviewId(null);
      setIsPreviewSwitching(false);
      return;
    }

    setIsPreviewSwitching(true);
    setActivePreviewId(null);

    previewSwitchRafRef.current = window.requestAnimationFrame(() => {
      setActivePreviewId(previewId);
      previewSwitchTimerRef.current = window.setTimeout(() => {
        setIsPreviewSwitching(false);
      }, 140);
    });

    return () => {
      clearPreviewSwitchHandles();
    };
  }, [previewId]);
 
  const audienceFilters: Array<"All" | "Tech" | "Non-Tech"> = ["All", "Non-Tech", "Tech"];
  const filtered = templates.filter((template) => {
    if (activeAudience === "All") return true;
    return activeAudience === "Tech" ? template.audience === "tech" : template.audience === "non-tech";
  });
  const categoryOrder: TemplateMeta["category"][] = ["non-tech", "tech"];
  const categorySections = useMemo(() => {
    const grouped = new Map<TemplateMeta["category"], TemplateMeta[]>();

    filtered.forEach((template) => {
      const items = grouped.get(template.category) ?? [];
      items.push(template);
      grouped.set(template.category, items);
    });

    return Array.from(grouped.entries())
      .sort(([leftCategory], [rightCategory]) => {
        const leftIndex = categoryOrder.indexOf(leftCategory);
        const rightIndex = categoryOrder.indexOf(rightCategory);

        if (leftIndex === -1 && rightIndex === -1) return leftCategory.localeCompare(rightCategory);
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      })
      .map(([category, items]) => ({
        category,
        label: category === "tech" ? "Tech Templates" : "Non-Tech Templates",
        items,
      }));
  }, [filtered]);

  const renderTemplateCards = (items: TemplateMeta[], offset = 0) => (
    items.map((t, idx) => (
      <div
        key={t.id}
        className="tp-card"
        style={{ animationDelay: `${(offset + idx) * 60}ms` }}
        onMouseEnter={() => setHoveredId(t.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="tp-card-thumb">
          <div className="tp-card-thumb-inner">
            <div className="tp-card-thumb-paper" style={{ aspectRatio: "240/310" }}>
              {t.thumbnailUrl ? (
                <img
                  src={t.thumbnailUrl}
                  alt={t.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                />
              ) : (
                <ThumbnailSVG template={t} />
              )}
            </div>
          </div>
          <div className="tp-card-hover-overlay">
            <button className="tp-card-preview-btn" onClick={() => handlePreviewSelect(t.id)}>
              Preview Template →
            </button>
          </div>
          {t.isPremium && (
            <div className="tp-card-premium-badge" style={{ position: "absolute", top: 14, left: 14, background: "#F59E0B", color: "#0E0E0E", fontSize: "9.5px", fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>
              ★ PRO
            </div>
          )}
        </div>
        <div className="tp-card-body">
          <div className="tp-card-top">
            <div className="tp-card-name">{t.name}</div>
            <span className="tp-card-tag">{t.tag}</span>
          </div>
          <p className="tp-card-desc">{t.description}</p>
          <div className="tp-card-footer">
            <div className="tp-card-accent">
              <div className="tp-card-swatch" style={{ background: t.accent }} />
              <span className="tp-card-font">{t.font} · {t.category === "tech" ? "Tech" : "Non-Tech"}</span>
            </div>
            <button className="tp-card-use-btn" onClick={() => handlePreviewSelect(t.id)}>
              Preview →
            </button>
          </div>
        </div>
      </div>
    ))
  );
 
  return (
    <>
    <style>{css}</style>
      <div className="tp-root">
        {/* NAV */}
        <nav className={`tp-nav${scrolled ? " scrolled" : ""}`}>
          <div className="tp-logo"><Logo /></div>
          <div className="tp-nav-links">
            <Link to="/templates" className="tp-nav-link active">Templates</Link>
            <Link to="/resumes" className="tp-nav-link">My Resumes</Link>
          </div>
        </nav>
 
        {/* HERO */}
        <section className="tp-hero">
          <div className="tp-hero-badge"><span className="tp-pill-dot" />{templates.length || 0} ATS-Optimised Templates</div>
          <h1 className="tp-hero-h1">
            Resumes that get<br />
            <em>past the bots,</em><br />
            into human hands.
          </h1>
          <p className="tp-hero-sub">
            Every template is built from the ground up for ATS compatibility — clean HTML, real text, zero tables. Designed by engineers who've reviewed thousands of resumes.
          </p>
          <div className="tp-hero-pills">
            {["✓ Real HTML — no images", "✓ ATS parsed 100%", "✓ Live preview", "✓ Export to PDF"].map(p => (
              <div className="tp-pill" key={p}>{p}</div>
            ))}
          </div>
        </section>
 
        {/* FILTER */}
        <div className="tp-filter">
          {audienceFilters.map(filter => (
            <button key={filter} className={`tp-filter-btn${activeAudience === filter ? " active" : ""}`} onClick={() => setActiveAudience(filter)}>
              {filter}
            </button>
          ))}
        </div>
 
        {/* GRID */}
        {loadError && (
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px 24px", color: "#fda4af", fontSize: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => { void loadTemplatesData(true); }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #fda4af55",
                background: "transparent",
                color: "#fecdd3",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Retry Now
            </button>
          </div>
        )}

        <div className="tp-grid">
          {loadingTemplates && (
            <>
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#666", fontSize: 13, marginBottom: 8 }}>
                {loadingMessage}
              </div>
              {skeletonItems.map((item) => (
                <div key={item} className="tp-card" aria-hidden="true">
                  <div className="tp-card-thumb">
                    <div className="tp-card-thumb-inner">
                      <div className="tp-card-thumb-paper" style={{ aspectRatio: "240/310" }}>
                        <div className="tp-skeleton" style={{ width: "100%", height: "100%" }} />
                      </div>
                    </div>
                  </div>
                  <div className="tp-card-body">
                    <div className="tp-card-top" style={{ marginBottom: 10 }}>
                      <div className="tp-skeleton" style={{ width: "45%", height: 14 }} />
                      <div className="tp-skeleton" style={{ width: 56, height: 18, borderRadius: 20 }} />
                    </div>
                    <div className="tp-skeleton" style={{ width: "92%", height: 10, marginBottom: 8 }} />
                    <div className="tp-skeleton" style={{ width: "72%", height: 10, marginBottom: 14 }} />
                    <div className="tp-card-footer">
                      <div className="tp-skeleton" style={{ width: 90, height: 12 }} />
                      <div className="tp-skeleton" style={{ width: 62, height: 12 }} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {!loadingTemplates && filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", color: "#888", textAlign: "center", padding: "40px 0" }}>
              No published templates found.
            </div>
          )}

          {!loadingTemplates && activeAudience === "All" && categorySections.map((section, sectionIndex) => (
            <div key={section.category} style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, border: "1px solid #2A2A2A", background: "#141414", color: section.category === "tech" ? "#7DD3FC" : "#C8F55A", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, marginTop: sectionIndex === 0 ? 4 : 20, marginBottom: -4 }}>
                {section.label}
              </div>
              <div className="tp-grid" style={{ padding: 0, marginTop: 14 }}>
                {renderTemplateCards(section.items, 0)}
              </div>
            </div>
          ))}

          {!loadingTemplates && activeAudience !== "All" && renderTemplateCards(filtered, 0)}
        </div>

        {!loadingTemplates && !loadError && page < totalPages && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 40px" }}>
            <button
              type="button"
              onClick={() => { void loadTemplatesData(false); }}
              disabled={isLoadingMore}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid #2A2A2A",
                background: "#141414",
                color: "#C8C7C0",
                cursor: isLoadingMore ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {isLoadingMore ? "Loading more templates..." : "Load more templates"}
            </button>
          </div>
        )}
 
        {/* ATS INFO */}
        <div className="tp-ats">
          <h2 className="tp-ats-h2">Why ATS compatibility matters</h2>
          <p className="tp-ats-sub">75% of resumes are rejected by automated systems before a human ever sees them.</p>
          <div className="tp-ats-grid">
            {[
              { icon: "◎", title: "Real HTML Text", body: "Every character in your resume is selectable, searchable plain text — not an image or canvas render." },
              { icon: "◧", title: "No Tables or Columns", body: "ATS parsers choke on complex CSS grids and HTML tables. Our layouts use simple, linear reading order." },
              { icon: "◈", title: "Semantic Structure", body: "Headings, lists, and paragraphs are used correctly so parsers understand what each section means." },
            ].map(({ icon, title, body }) => (
              <div className="tp-ats-card" key={title}>
                <div className="tp-ats-icon">{icon}</div>
                <div className="tp-ats-card-title">{title}</div>
                <div className="tp-ats-card-body">{body}</div>
              </div>
            ))}
          </div>
        </div>
 
        {/* PREVIEW MODAL */}
        {previewId && (previewTemplate || loadingTemplates || isPreviewSwitching) && (
          <div
            className="tp-modal-overlay"
            onClick={e => {
              if (e.target !== e.currentTarget) return;
              clearPreviewSwitchHandles();
              setPreviewId(null);
              setActivePreviewId(null);
              setIsPreviewSwitching(false);
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete("preview");
              setSearchParams(nextParams, { replace: true });
            }}
          >
            <div className="tp-modal-topbar">
              <div className="tp-modal-info">
                {/* Template switcher strip */}
                <div className="tp-modal-nav">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      className={`tp-modal-nav-btn${previewId === t.id ? " active" : ""}`}
                      onClick={() => handlePreviewSelect(t.id)}
                      style={{ padding: "5px 14px" }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tp-modal-actions">
                {previewTemplate ? (
                  <button
                    onClick={() => {
                      if (!previewId) return;
                      handleUseTemplate(previewId);
                    }}
                    className="tp-modal-use-btn"
                    style={{ padding: "10px 24px" }}
                  >
                    <span>Use This Template</span>
                    <span>→</span>
                  </button>
                ) : (
                  <div className="tp-skeleton" style={{ width: 180, height: 42, borderRadius: 10 }} />
                )}
                <button
                  className="tp-modal-close"
                  onClick={() => {
                    clearPreviewSwitchHandles();
                    setPreviewId(null);
                    setActivePreviewId(null);
                    setIsPreviewSwitching(false);
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete("preview");
                    setSearchParams(nextParams, { replace: true });
                  }}
                >
                  ×
                </button>
              </div>
            </div>
 
            {/* Full resume render */}
            <div className="tp-modal-scroll">
              {previewTemplate && previewSample && !isPreviewSwitching ? (
                <>
                  {/* Template info strip */}
                  <div style={{ background: "#0E0E0E", borderBottom: "1px solid #1A1A1A", padding: "12px 40px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: previewTemplate.accent }} />
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#888" }}>
                        <strong style={{ color: "#F0EFE8" }}>{previewTemplate.name}</strong> — {previewTemplate.description}
                      </span>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["ATS Friendly", "Live Preview", "Export to PDF"].map(label => (
                        <span key={label} style={{ fontSize: 10, fontWeight: 700, color: "#C8F55A", background: "rgba(200,245,90,0.1)", border: "1px solid rgba(200,245,90,0.2)", padding: "3px 10px", borderRadius: 20 }}>✓ {label}</span>
                      ))}
                    </div>
                  </div>

                  <div className="tp-modal-paper">
                    <ResumeRenderer resume={previewSample} />
                  </div>
                  <div className="tp-modal-bottom-padding" />
                </>
              ) : (
                <>
                  <div style={{ background: "#0E0E0E", borderBottom: "1px solid #1A1A1A", padding: "12px 40px" }}>
                    <div className="tp-skeleton" style={{ width: "60%", maxWidth: 520, height: 14 }} />
                  </div>
                  <div className="tp-modal-paper">
                    <div className="tp-skeleton" style={{ width: "100%", minHeight: 860 }} />
                  </div>
                  <div className="tp-modal-bottom-padding" />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
