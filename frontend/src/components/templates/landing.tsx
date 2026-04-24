import { JSX, useEffect, useState } from "react";
import { ResumeDocument, ResumeStyle, SectionVisibility } from "@/types/resume-types";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { sampleData } from "@/data/sampleData";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import { TemplateMeta } from "@/data/templateMeta";

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

const buildPreviewSample = (template: TemplateMeta): ResumeDocument => {
  const stylePatch = template.cssVars ?? {};
  const slotsPatch = template.slots ?? {};

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


function ThumbnailSVG({ template }: { template: TemplateMeta }) {
  const id = template.id;
  const configs: Record<string, JSX.Element> = {
    classic: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FAF8F5" />
        <rect x="20" y="20" width="100" height="12" rx="2" fill="#1a1a1a" opacity="0.85" />
        <rect x="20" y="36" width="160" height="2" rx="1" fill="#555" opacity="0.4" />
        <rect x="20" y="50" width="200" height="1.5" fill="#1a1a1a" opacity="0.8" />
        <rect x="20" y="57" width="200" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        <rect x="20" y="62" width="180" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        <rect x="20" y="67" width="190" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        {[85,100,118,136].map((y, i) => (
          <g key={y}>
            <rect x="20" y={y} width="42" height="3.5" rx="1" fill="#1a1a1a" opacity="0.55" />
            <rect x="20" y={y + 7} width="200" height="0.75" fill="#ccc" />
            <rect x="20" y={y + 11} width={[145, 130, 138, 125][i]} height="1.8" rx="0.5" fill="#333" opacity="0.15" />
            <rect x="20" y={y + 15} width={[200, 185, 195, 180][i]} height="1.8" rx="0.5" fill="#333" opacity="0.12" />
            <rect x="20" y={y + 19} width={[190, 170, 180, 165][i]} height="1.8" rx="0.5" fill="#333" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    executive: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#EEF1F7" />
        <rect x="0" y="0" width="240" height="62" fill="#1B2B4B" />
        <rect x="18" y="14" width="120" height="14" rx="2" fill="#F1F5F9" opacity="0.9" />
        <rect x="18" y="32" width="80" height="2.5" rx="1" fill="#A8BDD8" opacity="0.7" />
        <rect x="18" y="40" width="160" height="2" rx="0.5" fill="#A8BDD8" opacity="0.35" />
        <rect x="18" y="48" width="130" height="2" rx="0.5" fill="#A8BDD8" opacity="0.25" />
        {[72, 100, 128, 156, 180, 204, 232, 260].map((y, i) => (
          <g key={y}>
            {i % 3 === 0 && <><rect x="18" y={y} width="50" height="4" rx="1" fill="#1B2B4B" opacity="0.6" /><rect x="18" y={y + 6} width="204" height="0.75" fill="#1B2B4B" opacity="0.2" /></>}
            <rect x="18" y={y + (i % 3 === 0 ? 10 : 0)} width={[180, 155, 170, 160, 140, 165, 150, 145][i]} height="1.8" rx="0.5" fill="#1B2B4B" opacity="0.13" />
            <rect x="18" y={y + (i % 3 === 0 ? 14 : 4)} width={[200, 170, 185, 175, 158, 180, 165, 160][i]} height="1.8" rx="0.5" fill="#1B2B4B" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    modern: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F0FDFB" />
        <rect x="0" y="0" width="4" height="310" fill="#0F766E" opacity="0.3" />
        <rect x="16" y="14" width="100" height="13" rx="2" fill="#0F1A14" opacity="0.8" />
        <rect x="16" y="31" width="70" height="3" rx="1" fill="#555" opacity="0.45" />
        <rect x="16" y="39" width="180" height="2" rx="0.5" fill="#333" opacity="0.15" />
        {[58, 92, 130, 168, 206, 248, 275].map((y, i) => (
          <g key={y}>
            <rect x="8" y={y} width="3" height={i < 5 ? 36 : 22} rx="1.5" fill="#0F766E" opacity="0.4" />
            <rect x="16" y={y} width="45" height="3.5" rx="1" fill="#0F766E" opacity="0.65" />
            <rect x="16" y={y + 7} width={[180, 165, 170, 155, 160, 140, 150][i]} height="1.8" rx="0.5" fill="#134E4A" opacity="0.15" />
            <rect x="16" y={y + 12} width={[200, 175, 185, 165, 175, 155, 165][i]} height="1.8" rx="0.5" fill="#134E4A" opacity="0.12" />
            {i < 5 && <rect x="16" y={y + 17} width={[190, 160, 175, 150, 165][i] ?? 150} height="1.8" rx="0.5" fill="#134E4A" opacity="0.10" />}
          </g>
        ))}
      </svg>
    ),
    compact: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F8F8F8" />
        <rect x="18" y="16" width="90" height="11" rx="2" fill="#111" opacity="0.8" />
        <rect x="18" y="31" width="160" height="1.8" rx="0.5" fill="#444" opacity="0.4" />
        <rect x="18" y="40" width="204" height="0.75" fill="#111" opacity="0.6" />
        {[50, 72, 96, 120, 148, 172, 196, 220, 248, 270].map((y, i) => (
          <g key={y}>
            <rect x="18" y={y} width="70" height="2" rx="0.5" fill="#555" opacity="0.5" />
            <rect x="98" y={y} width="0.5" height="2" fill="#ccc" />
            <rect x="104" y={y} width={[112, 100, 108, 95, 110, 100, 105, 95, 108, 100][i]} height="2" rx="0.5" fill="#222" opacity="0.15" />
            <rect x="104" y={y + 5} width={[120, 108, 115, 102, 118, 108, 112, 100, 116, 108][i]} height="1.5" rx="0.5" fill="#222" opacity="0.10" />
            {i % 3 === 2 && <rect x="18" y={y + 12} width="204" height="0.5" fill="#ddd" />}
          </g>
        ))}
      </svg>
    ),
    sidebar: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#fff" />
        <rect x="0" y="0" width="76" height="310" fill="#1E293B" />
        <rect x="10" y="16" width="56" height="56" rx="28" fill="#334155" />
        <rect x="14" y="78" width="48" height="5" rx="2" fill="#CBD5E1" opacity="0.7" />
        <rect x="18" y="87" width="40" height="3" rx="1" fill="#94A3B8" opacity="0.5" />
        <rect x="10" y="100" width="56" height="0.75" fill="#334155" />
        {[108, 116, 124, 132, 140].map((y) => <rect key={y} x="10" y={y} width={44 + Math.floor(Math.random() * 12)} height="2.5" rx="1" fill="#475569" opacity="0.55" />)}
        <rect x="10" y="154" width="56" height="0.75" fill="#334155" />
        <rect x="10" y="162" width="56" height="3" rx="1" fill="#64748B" opacity="0.4" />
        {[170, 178, 186, 194, 202, 210].map((y) => <rect key={y} x="10" y={y} width={24 + (y % 16)} height="8" rx="4" fill="#334155" />)}
        <rect x="10" y="228" width="56" height="0.75" fill="#334155" />
        {[236, 244, 252].map((y) => <rect key={y} x="10" y={y} width="52" height="2.5" rx="1" fill="#475569" opacity="0.4" />)}
        {/* Right panel */}
        <rect x="88" y="16" width="136" height="9" rx="2" fill="#1E293B" opacity="0.75" />
        <rect x="88" y="28" width="100" height="3" rx="1" fill="#475569" opacity="0.4" />
        <rect x="88" y="40" width="144" height="1" fill="#1E293B" opacity="0.15" />
        {[46, 53, 60].map(y => <rect key={y} x="88" y={y} width={144 - (y - 46) * 2} height="1.8" rx="0.5" fill="#334155" opacity="0.18" />)}
        <rect x="88" y="74" width="60" height="5.5" rx="1" fill="#1E293B" opacity="0.65" />
        <rect x="88" y="82" width="144" height="0.75" fill="#1E293B" opacity="0.2" />
        {[88, 100, 114, 128, 142, 158, 172, 186, 200, 214, 228, 242, 256, 270, 284].map((y, i) => (
          <rect key={y} x="88" y={y} width={[136, 120, 128, 112, 136, 122, 128, 114, 132, 110, 124, 116, 130, 112, 128][i] ?? 120} height="2" rx="0.5" fill="#334155" opacity="0.18" />
        ))}
      </svg>
    ),
  };
  if (configs[id]) return configs[id];

  const bg = template.cssVars?.backgroundColor ?? template.palette?.[0] ?? "#f8f8f8";
  const accent = template.cssVars?.accentColor ?? template.accent ?? "#1a1a1a";
  const text = template.cssVars?.textColor ?? template.palette?.[2] ?? "#444444";

  return (
    <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
      <rect width="240" height="310" fill={bg} />
      <rect x="0" y="0" width="240" height="8" fill={accent} opacity="0.9" />
      <rect x="18" y="24" width="120" height="10" rx="2" fill={accent} opacity="0.75" />
      <rect x="18" y="40" width="170" height="3" rx="1" fill={text} opacity="0.35" />
      <rect x="18" y="55" width="204" height="1" fill={accent} opacity="0.25" />
      {[72, 95, 118, 141, 164, 187, 210, 233, 256, 279].map((y, i) => (
        <g key={y}>
          <rect x="18" y={y} width={48 + (i % 3) * 10} height="3" rx="1" fill={accent} opacity="0.6" />
          <rect x="72" y={y} width={146 - (i % 4) * 12} height="2.2" rx="0.5" fill={text} opacity="0.18" />
        </g>
      ))}
    </svg>
  );
}

    
const css = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&family=Outfit:wght@300;400;500;600;700&family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #0E0E0E; }
 
    .tp-root { font-family: 'Outfit', sans-serif; background: #0E0E0E; color: #F0EFE8; min-height: 100vh; }
 
    /* NAV */
    .tp-nav { position: sticky; top: 0; z-index: 50; padding: 0 40px; height: 64px; display: flex; align-items: center; justify-content: space-between; transition: all 0.3s; }
    .tp-nav.scrolled { background: rgba(14,14,14,0.95); border-bottom: 1px solid #1F1F1F; backdrop-filter: blur(12px); }
    .tp-logo { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 500; color: #F0EFE8; letter-spacing: -0.5px; }
    .tp-logo em { font-style: italic; color: #C8F55A; }
    .tp-nav-links { display: flex; gap: 32px; }
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
    .tp-card { border-radius: 16px; overflow: hidden; background: #141414; border: 1px solid #1F1F1F; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; animation: fadein 0.5s ease both; }
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
      .tp-nav { height: auto; min-height: 56px; padding: 8px 12px; }
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [previewId, setPreviewId] = useState<string | null>(() => searchParams.get("preview"));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const initialPreviewParam = searchParams.get("preview");
 
  const previewTemplate = templates.find(t => t.id === previewId);

  const fetchTemplatesWithRetry = async () => {
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
        const response = await api.get("/templates", { timeout: 35000 });
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];

        const mapped: TemplateMeta[] = rows.map((row: any) => {
          const rawCategory = String(row.category ?? "Professional");
          const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
          const accent = row.cssVars?.accentColor ?? "#1a1a1a";
          const font = String(row.cssVars?.bodyFont ?? "Outfit").split(",")[0].trim();

          return {
            id: row.layoutId,
            name: row.name ?? row.layoutId,
            tag: row.tag ?? "General",
            category,
            accent,
            font,
            description: row.description ?? "",
            isPremium: Boolean(row.isPremium),
            palette: [
              row.cssVars?.backgroundColor ?? "#ffffff",
              accent,
              row.cssVars?.textColor ?? "#333333",
            ],
            cssVars: row.cssVars ?? {},
            slots: row.slots ?? {},
          };
        });

        return mapped;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const loadTemplatesData = async () => {
    setLoadingTemplates(true);
    setLoadingMessage("Loading templates...");
    setLoadError(null);

    try {
      const mapped = await fetchTemplatesWithRetry();
      setTemplates(mapped);
    } catch {
      setLoadError("Could not load public templates from the database. The server may be waking up (cold start). Please retry in a few seconds.");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
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
    let mounted = true;

    void (async () => {
      await loadTemplatesData();
      if (!mounted) return;
    })();

    return () => {
      mounted = false;
    };
  }, []);
 
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
 
  const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = templates.filter(t => activeCategory === "All" || t.category === activeCategory);
 
  return (
    <>
    <style>{css}</style>
      <div className="tp-root">
        {/* NAV */}
        <nav className={`tp-nav${scrolled ? " scrolled" : ""}`}>
          <div className="tp-logo">Resume<em>Studio</em></div>
          < Link to="/resumes" className="tp-nav-cta">My Resume</Link>
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
          {categories.map(cat => (
            <button key={cat} className={`tp-filter-btn${activeCategory === cat ? " active" : ""}`} onClick={() => setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
 
        {/* GRID */}
        {loadError && (
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px 24px", color: "#fda4af", fontSize: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => { void loadTemplatesData(); }}
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

          {filtered.map((t, idx) => (
            <div
              key={t.id}
              className="tp-card"
              style={{ animationDelay: `${idx * 60}ms` }}
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="tp-card-thumb">
                <div className="tp-card-thumb-inner">
                  <div className="tp-card-thumb-paper" style={{ aspectRatio: "240/310" }}>
                    <ThumbnailSVG template={t} />
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
                    <span className="tp-card-font">{t.font}</span>
                  </div>
                  <button className="tp-card-use-btn" onClick={() => handlePreviewSelect(t.id)}>
                    Preview →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
 
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
        {previewId && (previewTemplate || loadingTemplates) && (
          <div
            className="tp-modal-overlay"
            onClick={e => {
              if (e.target !== e.currentTarget) return;
              setPreviewId(null);
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
                    setPreviewId(null);
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
              {previewTemplate ? (
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
                    <ResumeRenderer resume={buildPreviewSample(previewTemplate)} />
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