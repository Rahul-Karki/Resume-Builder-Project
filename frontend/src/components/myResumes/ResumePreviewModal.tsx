import { useEffect } from "react";  
import { ResumeDocument } from "@/types/resume-types";
import { TEMPLATES } from "@/utils/templateMapping";
import { relativeTime } from "@/utils/relativeTime";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { calculateCompletionScore } from "@/hooks/useMyResume";

export function PreviewModal({ resume,onClose,onEdit }: {resume:ResumeDocument;onClose:()=>void;onEdit:(id:string)=>void}) {
  const tpl=TEMPLATES.find(t=>t.id===resume.templateId)??TEMPLATES[0];
  const completionScore = calculateCompletionScore(resume);
  const sc=completionScore>=80?"#4ADE80":completionScore>=50?"#F59E0B":"#F87171";
  const sectionCounts = {
    experience: resume.sections?.experience?.length ?? 0,
    education: resume.sections?.education?.length ?? 0,
    skills: resume.sections?.skills?.length ?? 0,
    projects: resume.sections?.projects?.length ?? 0,
    certifications: resume.sections?.certifications?.length ?? 0,
  };
  const resumeId = String(resume._id ?? resume.id ?? "");
  const updatedAt = resume.updatedAt ?? resume.createdAt ?? new Date().toISOString();
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[onClose]);
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",backdropFilter:"blur(8px)",fontFamily:"'Outfit',sans-serif"}}>
      {/* Bar */}
      <div style={{height:60,background:"#080808",borderBottom:"1px solid #141414",display:"flex",alignItems:"center",padding:"0 24px",gap:14,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:tpl.accent}}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#F0EFE8"}}>{resume.title}</div>
            <div style={{fontSize:11,color:"#A7A7A7",lineHeight:1.3}}>{tpl.name} · {relativeTime(updatedAt)}</div>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:sc,background:sc+"18",border:`1px solid ${sc}33`,padding:"3px 10px",borderRadius:20}}>{completionScore}% Complete</span>
          <button onClick={()=>{onEdit(resumeId);onClose();}}
            style={{padding:"8px 20px",background:"#C8F55A",border:"none",borderRadius:9,color:"#0E0E0E",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
            ✎ Edit Resume
          </button>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:9,background:"#1A1A1A",border:"1px solid #252525",color:"#666",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
      </div>
      {/* Content */}
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {/* Sidebar info */}
        <div style={{width:240,background:"#080808",borderRight:"1px solid #111",padding:"20px",overflowY:"auto",flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2A2A2A",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Resume Info</div>
          {[["Name",resume.personalInfo.name],["Title",resume.personalInfo.title],["Email",resume.personalInfo.email],["Location",resume.personalInfo.location]].filter(([,v])=>v).map(([l,v])=>(
            <div key={l} style={{marginBottom:10}}>
              <div style={{fontSize:10,color:"#2A2A2A",marginBottom:2}}>{l}</div>
              <div style={{fontSize:12,color:"#666"}}>{v}</div>
            </div>
          ))}
          <div style={{marginTop:16,height:1,background:"#141414",marginBottom:16}}/>
          <div style={{fontSize:10,fontWeight:700,color:"#2A2A2A",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>Sections</div>
          {(["experience","education","skills","projects","certifications"] as const).map(k=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #111"}}>
              <span style={{fontSize:11,color:sectionCounts[k]>0?"#555":"#222",textTransform:"capitalize"}}>{k}</span>
              <span style={{fontSize:11,fontWeight:700,color:sectionCounts[k]>0?sc:"#222"}}>{sectionCounts[k]>0?`${sectionCounts[k]}`:"—"}</span>
            </div>
          ))}
          <div style={{marginTop:16}}>
            <div style={{fontSize:10,fontWeight:700,color:"#2A2A2A",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>Completion</div>
            <div style={{height:5,background:"#1A1A1A",borderRadius:3,overflow:"hidden",marginBottom:6}}>
              <div style={{width:`${completionScore}%`,height:"100%",background:sc,borderRadius:3}}/>
            </div>
            <div style={{fontSize:11,color:sc,fontWeight:700}}>{completionScore}% — {completionScore>=80?"Ready to send":completionScore>=50?"Almost there":"Needs more work"}</div>
          </div>
        </div>
        {/* Large thumb */}
        <div style={{flex:1,overflow:"auto",background:"#050505",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px"}}>
          <div style={{width:"100%",maxWidth:794,minHeight:"1123px",borderRadius:8,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.8)",background:"#fff"}}>
            <div style={{width:"794px",minHeight:"1123px",margin:"0 auto",background:"#fff"}}>
              <ResumeRenderer resume={resume} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}