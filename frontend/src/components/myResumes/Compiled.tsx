import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { ResumeDocument, SavedResume, SortOption } from "@/types/resume-types";
import {
  getResumePayload,
  mapResumeDocumentToSavedResume,
  useMyResumes,
} from "@/hooks/useMyResume";
import { Card } from "./ResumeCard";
import { Skeleton } from "./SkeletonCard";
import { EmptyState } from "./EmptyState";
import { PreviewModal } from "./ResumePreviewModal";
import { Toast } from "./Toast";
import { DelModal } from "./DeleteConfirmModal";

export default function Compiled() {
  const { user, rawResumes, resumes, loading, error, authRequired, refresh } = useMyResumes();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updatedAt");
  const [delResume, setDelResume] = useState<SavedResume | null>(null);
  const [prevResume, setPrevResume] = useState<ResumeDocument | null>(null);
  const [templateOverlayOpen, setTemplateOverlayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
 
  const showMsg = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      if (!localStorage.getItem("accessToken")) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (!active) return;
        setIsAdmin(response.data?.user?.role === "admin");
      } catch {
        if (!active) return;
        setIsAdmin(false);
      }
    };

    void loadRole();
    return () => {
      active = false;
    };
  }, []);

  const displayed = useMemo(
    () =>
      resumes
        .filter(
          (resume) =>
            !search ||
            resume.title.toLowerCase().includes(search.toLowerCase()) ||
            resume.personalInfo.name.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          if (sortBy === "title") return a.title.localeCompare(b.title);
          if (sortBy === "completion") return b.completionScore - a.completionScore;
          if (sortBy === "createdAt") {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }

          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [resumes, search, sortBy],
  );

  const selectedRawResume = useMemo(
    () => rawResumes.find((resume) => mapResumeDocumentToSavedResume(resume).id === delResume?.id),
    [delResume?.id, rawResumes],
  );
 
  const SORT_OPTS: {v:SortOption;l:string}[] = [{v:"updatedAt",l:"Last Modified"},{v:"createdAt",l:"Date Created"},{v:"title",l:"Title A–Z"},{v:"completion",l:"Completion %"}];
 
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300&family=Outfit:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#080808;} ::-webkit-scrollbar-thumb{background:#1E1E1E;border-radius:2px;}
    @keyframes cardIn{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
    @keyframes toastIn{from{opacity:0;transform:translate(-50%,10px);}to{opacity:1;transform:translate(-50%,0);}}
  `;
 
  return (
    <>
      <style>{css}</style>
        <div style={{minHeight:"100vh",background:"#080808",color:"#F0EFE8",fontFamily:"'Outfit',sans-serif"}}>
 
        <nav style={{height:58,background:"#0A0A0A",borderBottom:"1px solid #111",display:"flex",alignItems:"center",padding:"0 28px",gap:24,position:"sticky",top:0,zIndex:40}}>
          <div style={{fontWeight:800,fontSize:16,letterSpacing:"-0.3px"}}>Resume<span style={{color:"#C8F55A"}}>Studio</span></div>
          <Link
            to="/templates"
            style={{fontSize:13,fontWeight:500,color:"#666",textDecoration:"none",transition:"color 0.15s"}}
            onMouseEnter={e => (e.currentTarget.style.color = "#C8C7C0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#666")}
          >
            Templates
          </Link>
          <span style={{fontSize:13,fontWeight:700,color:"#F0EFE8",borderBottom:"1px solid #C8F55A",paddingBottom:2}}>My Resumes</span>
          {isAdmin && (
            <Link
              to="/admin"
              style={{fontSize:13,fontWeight:500,color:"#666",textDecoration:"none",transition:"color 0.15s"}}
              onMouseEnter={e => (e.currentTarget.style.color = "#C8C7C0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#666")}
            >
              Admin
            </Link>
          )}
          <div style={{flex:1}}/>
          {!user && (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Link to="/login" style={{padding:"8px 14px",background:"#111",border:"1px solid #1A1A1A",borderRadius:999,color:"#CFCFCF",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                Log in
              </Link>
              <Link to="/signup" style={{padding:"8px 14px",background:"#C8F55A",border:"1px solid #C8F55A",borderRadius:999,color:"#0E0E0E",fontSize:12,fontWeight:800,textDecoration:"none"}}>
                Sign up
              </Link>
            </div>
          )}
        </nav>
 
        <div style={{maxWidth:1280,margin:"0 auto",padding:"32px 28px 80px"}}>

          {authRequired && !loading ? (
            <div style={{display:"grid",placeItems:"center",minHeight:"calc(100vh - 140px)",padding:"24px 0"}}>
              <div style={{width:"100%",maxWidth:620,background:"linear-gradient(180deg, rgba(17,17,17,0.95), rgba(10,10,10,0.95))",border:"1px solid #1C1C1C",borderRadius:24,padding:"40px 32px",textAlign:"center",boxShadow:"0 30px 90px rgba(0,0,0,0.55)"}}>
                <div style={{width:68,height:68,borderRadius:"50%",margin:"0 auto 18px",background:"rgba(200,245,90,0.14)",border:"1px solid rgba(200,245,90,0.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🔒</div>
                <h1 style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:300,letterSpacing:"-0.5px",marginBottom:10}}>You are not logged in</h1>
                <p style={{fontSize:14,color:"#5C5C5C",lineHeight:1.7,maxWidth:440,margin:"0 auto 28px"}}>
                  Sign in to view the resumes saved on your account. Your resume grid, preview cards, and actions all stay exactly in the same style once you are authenticated.
                </p>
                <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                  <Link to="/login" style={{padding:"12px 22px",background:"#C8F55A",border:"1px solid #C8F55A",borderRadius:12,color:"#0E0E0E",fontSize:13,fontWeight:800,textDecoration:"none"}}>
                    Go to login
                  </Link>
                  <Link to="/signup" style={{padding:"12px 22px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:12,color:"#E4E4E4",fontSize:13,fontWeight:700,textDecoration:"none"}}>
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{marginBottom:24}}>
                <h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:300,letterSpacing:"-0.5px",marginBottom:4}}>My Resumes</h1>
                <p style={{fontSize:13,color:"#444"}}>{resumes.length===0?"Start by picking a template below":`${resumes.length} resume${resumes.length!==1?"s":""} · Auto-saved`}</p>
              </div>

              {/* Toolbar */}
              {!loading&&resumes.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
                  {/* Search */}
                  <div style={{position:"relative",flex:1,minWidth:200,maxWidth:300}}>
                    <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#333",pointerEvents:"none"}}>⌕</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search resumes…"
                      style={{width:"100%",padding:"8px 12px 8px 32px",background:"#111",border:"1px solid #1A1A1A",borderRadius:9,color:"#C8C7C0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                      onFocus={e=>e.currentTarget.style.borderColor="#2A2A2A"} onBlur={e=>e.currentTarget.style.borderColor="#1A1A1A"}/>
                    {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:14}}>×</button>}
                  </div>
                  {/* Sort */}
                  <div style={{position:"relative"}}>
                    <button onClick={()=>setSortOpen(o=>!o)}
                      style={{padding:"8px 14px",background:"#111",border:"1px solid #1A1A1A",borderRadius:9,color:"#666",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                      ⇅ {SORT_OPTS.find(o=>o.v===sortBy)?.l}<span style={{fontSize:10,opacity:0.5}}>▾</span>
                    </button>
                    {sortOpen&&<>
                      <div style={{position:"fixed",inset:0,zIndex:49}} onClick={()=>setSortOpen(false)}/>
                      <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#0F0F0F",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden",zIndex:50,minWidth:170,boxShadow:"0 16px 40px rgba(0,0,0,0.5)"}}>
                        {SORT_OPTS.map(o=>(
                          <button key={o.v} onClick={()=>{setSortBy(o.v);setSortOpen(false);}}
                            style={{display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:sortBy===o.v?"#1A1A1A":"transparent",border:"none",color:sortBy===o.v?"#F0EFE8":"#555",fontSize:13,fontWeight:sortBy===o.v?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                            {sortBy===o.v?"✓ ":""}{o.l}
                          </button>
                        ))}
                      </div>
                    </>}
                  </div>
                  <span style={{fontSize:12,color:"#2A2A2A"}}>{displayed.length} result{displayed.length!==1?"s":""}</span>
                  <div style={{flex:1}}/>
                  <button onClick={()=>setTemplateOverlayOpen(true)}
                    style={{padding:"9px 20px",background:"#C8F55A",border:"none",borderRadius:9,color:"#0E0E0E",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    + Create Resume
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>{[1,2,3].map(i=><Skeleton key={i}/>)}</div>}

              {/* Error */}
              {!loading&&error&&(
                <div style={{marginBottom:20,padding:"14px 16px",borderRadius:12,border:"1px solid #3A1B1B",background:"rgba(127,29,29,0.15)",color:"#FCA5A5",fontSize:13,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                  <span>{error}</span>
                  <button onClick={()=>refresh()} style={{background:"transparent",border:"1px solid #5B1D1D",color:"#FCA5A5",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontFamily:"inherit"}}>
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!loading&&!error&&resumes.length===0&&<EmptyState name={user?.name ?? "there"} onPick={(id)=>navigate(`/builder?template=${encodeURIComponent(id)}`)}/>}

              {/* Grid */}
              {!loading&&!error&&resumes.length>0&&(
                <>
                  {displayed.length>0?(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
                      {displayed.map((resume,i)=>(
                        <Card key={resume.id} resume={resume} delay={i*55}
                          onEdit={id=>navigate(`/builder?resume=${encodeURIComponent(id)}`)}
                          onPreview={id=>setPrevResume(rawResumes.find((item)=>mapResumeDocumentToSavedResume(item).id===id) ?? null)}
                          onDuplicate={async id=>{
                            const source = rawResumes.find((item)=>mapResumeDocumentToSavedResume(item).id===id);
                            if (!source) return;

                            try {
                              const payload = getResumePayload(source);
                              const response = await api.post("/resumes", {
                                ...payload,
                                title: `${payload.title || source.title || "Untitled Resume"} (Copy)`,
                              });

                              if (response.data?.resume) {
                                showMsg(`"${source.title || "Resume"}" duplicated`);
                                await refresh();
                              }
                            } catch {
                              showMsg("Failed to duplicate resume");
                            }
                          }}
                          onDelete={id=>{ const r=resumes.find(r=>r.id===id); if(r) setDelResume(r); }}
                        />
                      ))}
                    </div>
                  ):(
                    <div style={{textAlign:"center",padding:"60px 0"}}>
                      <div style={{fontSize:32,opacity:0.2,marginBottom:12}}>◎</div>
                      <div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:6}}>No resumes match "{search}"</div>
                      <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:"#444",fontSize:13,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Clear search</button>
                    </div>
                  )}

                  {/* Create more CTA */}
                  <div style={{textAlign:"center",marginTop:40,padding:"28px",background:"#0A0A0A",border:"1px dashed #1A1A1A",borderRadius:16}}>
                    <div style={{fontSize:13,color:"#333",marginBottom:12}}>Ready to build another version?</div>
                    <button onClick={()=>setTemplateOverlayOpen(true)}
                      style={{padding:"10px 24px",background:"transparent",border:"1px solid #1E1E1E",borderRadius:9,color:"#666",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#C8F55A55";e.currentTarget.style.color="#C8F55A";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#1E1E1E";e.currentTarget.style.color="#666";}}>
                      + Create New Resume
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
 
        {/* Modals */}
        {delResume&&<DelModal resume={delResume} onConfirm={async()=>{
          try {
            if (selectedRawResume) {
              await api.delete(`/resumes/${selectedRawResume._id ?? selectedRawResume.id}`);
              showMsg(`"${delResume.title}" deleted`);
              await refresh();
            }
          } catch {
            showMsg("Failed to delete resume");
          } finally {
            setDelResume(null);
          }
        }} onCancel={()=>setDelResume(null)}/>}
        {prevResume&&<PreviewModal resume={prevResume} onClose={()=>setPrevResume(null)} onEdit={id=>navigate(`/builder?resume=${encodeURIComponent(id)}`)}/>}
        {templateOverlayOpen&&(
          <div
            onClick={(event)=>{ if (event.target === event.currentTarget) setTemplateOverlayOpen(false); }}
            style={{position:"fixed",inset:0,zIndex:220,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(10px)",display:"grid",placeItems:"center",padding:"24px"}}
          >
            <div style={{width:"100%",maxWidth:540,background:"linear-gradient(180deg, rgba(17,17,17,0.98), rgba(9,9,9,0.98))",border:"1px solid #232323",borderRadius:24,padding:"34px 28px 28px",boxShadow:"0 30px 100px rgba(0,0,0,0.65)",textAlign:"center"}}>
              <div style={{width:64,height:64,margin:"0 auto 16px",borderRadius:"50%",background:"rgba(200,245,90,0.12)",border:"1px solid rgba(200,245,90,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>✦</div>
              <h2 style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:300,letterSpacing:"-0.4px",marginBottom:10}}>Please select a template</h2>
              <p style={{fontSize:14,color:"#5E5E5E",lineHeight:1.7,maxWidth:380,margin:"0 auto 24px"}}>
                Choose a resume template to start building your next version.
              </p>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
                <Link
                  to="/templates"
                  onClick={()=>setTemplateOverlayOpen(false)}
                  style={{padding:"12px 20px",background:"#C8F55A",border:"1px solid #C8F55A",borderRadius:12,color:"#0E0E0E",fontSize:13,fontWeight:800,textDecoration:"none"}}
                >
                  Browse templates
                </Link>
                <button
                  onClick={()=>setTemplateOverlayOpen(false)}
                  style={{padding:"12px 20px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:12,color:"#E4E4E4",fontSize:13,fontWeight:700,cursor:"pointer"}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {toast&&<Toast msg={toast}/>}
      </div>
    </>
  );
}