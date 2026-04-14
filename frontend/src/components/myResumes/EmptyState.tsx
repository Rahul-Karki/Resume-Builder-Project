import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { Thumb } from "./ResumeThumbnail";
import { TemplateMeta } from "@/types/resume-types";

type PublicTemplate = {
  _id?: string;
  layoutId: string;
  name: string;
  description?: string;
  category?: string;
  tag?: string;
  isPremium?: boolean;
  cssVars?: {
    accentColor?: string;
    backgroundColor?: string;
    headingColor?: string;
    mutedColor?: string;
  };
};

type CardTemplate = {
  key: string;
  layoutId: string;
  name: string;
  tag: string;
  description: string;
  isPremium: boolean;
  accent: string;
  thumb: TemplateMeta;
};

const THUMB_IDS = ["classic", "executive", "modern", "compact", "sidebar"] as const;

export function EmptyState({ name, onPick }: { name: string; onPick: (id: string) => void }) {
  const [hov, setHov] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchTemplates = async () => {
      try {
        const response = await api.get("/templates");
        const list = Array.isArray(response.data?.data) ? response.data.data : [];

        if (mounted) {
          setTemplates(list);
        }
      } catch {
        if (mounted) {
          setTemplates([]);
        }
      } finally {
        if (mounted) {
          setLoadingTemplates(false);
        }
      }
    };

    void fetchTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  const cardTemplates = useMemo<CardTemplate[]>(() => {
    return templates
      .filter((template) => Boolean(template.layoutId))
      .map((template, index) => {
        const thumbId = THUMB_IDS.includes(template.layoutId as (typeof THUMB_IDS)[number])
          ? (template.layoutId as (typeof THUMB_IDS)[number])
          : THUMB_IDS[index % THUMB_IDS.length];

        const accent = template.cssVars?.accentColor || "#C8F55A";
        const bg = template.cssVars?.backgroundColor || "#FAF8F5";
        const primary = template.cssVars?.headingColor || accent;
        const secondary = template.cssVars?.mutedColor || "#555555";

        return {
          key: template._id ?? template.layoutId,
          layoutId: template.layoutId,
          name: template.name,
          tag: template.tag || "Template",
          description: template.description || "Build your resume with this template.",
          isPremium: Boolean(template.isPremium),
          accent,
          thumb: {
            id: thumbId,
            name: template.name,
            tag: template.tag || "Template",
            category: template.category || "General",
            description: template.description || "Build your resume with this template.",
            isPremium: Boolean(template.isPremium),
            accent,
            palette: {
              bg,
              primary,
              secondary,
            },
          },
        };
      });
  }, [templates]);

  return (
    <div style={{maxWidth:1100,margin:"0 auto",fontFamily:"'Outfit',sans-serif"}}>
      <div style={{textAlign:"center",padding:"40px 0 36px"}}>
        <div style={{fontSize:52,marginBottom:14,opacity:0.9}}>📄</div>
        <h2 style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:300,color:"#F0EFE8",letterSpacing:"-0.5px",marginBottom:10}}>
          No resumes yet, <em style={{fontStyle:"italic",color:"#C8F55A"}}>{name.split(" ")[0]}</em>
        </h2>
        <p style={{fontSize:14,color:"#444",maxWidth:440,margin:"0 auto",lineHeight:1.6}}>
          Pick one of our templates below and create your first resume in minutes.
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:16,marginBottom:40}}>
        {loadingTemplates ? (
          <div style={{gridColumn:"1 / -1",textAlign:"center",fontSize:13,color:"#555",padding:"14px 0"}}>Loading templates...</div>
        ) : cardTemplates.length > 0 ? (
          cardTemplates.map((t, i) => {
            const h = hov === t.layoutId;

            return (
              <div key={t.key} onMouseEnter={()=>setHov(t.layoutId)} onMouseLeave={()=>setHov(null)} onClick={()=>onPick(t.layoutId)}
                style={{background:"#111",border:`1.5px solid ${h?t.accent:"#191919"}`,borderRadius:14,overflow:"hidden",cursor:"pointer",
                  transform:h?"translateY(-5px)":"translateY(0)",transition:"all 0.22s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow:h?`0 20px 50px rgba(0,0,0,0.6),0 0 0 1px ${t.accent}30`:"none",
                  animationDelay:`${i*60}ms`}}>
                <div style={{height:205,background:"#080808",overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:"14px 16px"}}>
                    <div style={{width:"100%",maxWidth:155,borderRadius:4,overflow:"hidden",boxShadow:"0 8px 30px rgba(0,0,0,0.6)",
                      transform:h?"scale(1.05)":"scale(1)",transition:"transform 0.3s"}}><Thumb t={t.thumb}/></div>
                  </div>
                  <div style={{position:"absolute",inset:0,background:h?"rgba(0,0,0,0.55)":"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                    <div style={{background:t.accent,color:"#fff",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:800,
                      opacity:h?1:0,transform:h?"translateY(0) scale(1)":"translateY(6px) scale(0.9)",transition:"all 0.2s"}}>
                      Use Template →
                    </div>
                  </div>
                  {t.isPremium&&<div style={{position:"absolute",top:8,right:8,background:"#92400E",color:"#FCD34D",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20}}>★ PRO</div>}
                </div>
                <div style={{padding:"12px 14px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#F0EFE8"}}>{t.name}</span>
                    <span style={{fontSize:9,fontWeight:700,background:"#1A1A1A",color:"#555",border:"1px solid #222",padding:"2px 7px",borderRadius:20}}>{t.tag}</span>
                  </div>
                  <p style={{fontSize:11,color:"#444",lineHeight:1.45,margin:0}}>{t.description}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{gridColumn:"1 / -1",textAlign:"center",fontSize:13,color:"#666",padding:"14px 0"}}>
            No published templates are available right now.
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {["✓ Live Preview","✓ Custom Colors","✓ Export PDF","✓ Auto-save"].map((f)=>(
          <div key={f} style={{fontSize:12,fontWeight:600,color:"#333",background:"#0D0D0D",border:"1px solid #1A1A1A",padding:"6px 14px",borderRadius:20}}>{f}</div>
        ))}
      </div>
    </div>
  );
}