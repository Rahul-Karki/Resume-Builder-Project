import { useState } from "react";
import { Thumb } from "./ResumeThumbnail";
import { SavedResume } from "@/types/resume-types";
import { TEMPLATES } from "@/utils/templateMapping";
import { Ring } from "./CompletionRing";
import { relativeTime } from "@/utils/relativeTime";

export function Card({ resume,onEdit,onPreview,onDuplicate,onDelete,delay=0 }: {
  resume:SavedResume; onEdit:(id:string)=>void; onPreview:(id:string)=>void;
  onDuplicate:(id:string)=>void; onDelete:(id:string)=>void; delay?:number;
}) {
  const [hov,setHov]=useState(false);
  const tpl=TEMPLATES.find(t=>t.id===resume.templateId);
  const thumbTpl=tpl??TEMPLATES[0];
  const templateName = tpl?.name ?? resume.templateId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const sc=resume.completionScore>=80?"#4ADE80":resume.completionScore>=50?"#F59E0B":"#F87171";
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:"#111111",border:`1px solid ${hov?"#2A2A2A":"#191919"}`,borderRadius:16,overflow:"hidden",
        cursor:"pointer",transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform:hov?"translateY(-4px)":"translateY(0)",
        boxShadow:hov?"0 24px 64px rgba(0,0,0,0.65)":"0 2px 16px rgba(0,0,0,0.3)",
        display:"flex",flexDirection:"column",animation:"cardIn 0.4s ease both",animationDelay:`${delay}ms`}}>
      {/* Thumb */}
      <div onClick={()=>onPreview(resume.id)}
        style={{position:"relative",height:210,background:"#080808",overflow:"hidden",flexShrink:0}}>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:"14px 18px"}}>
          <div style={{width:"100%",maxWidth:170,borderRadius:5,overflow:"hidden",
            boxShadow:"0 10px 40px rgba(0,0,0,0.7)",
            transform:hov?"scale(1.04)":"scale(1)",transition:"transform 0.3s ease"}}>
            <Thumb t={thumbTpl}/>
          </div>
        </div>
        <div style={{position:"absolute",inset:0,background:hov?"rgba(0,0,0,0.5)":"rgba(0,0,0,0)",
          display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
          <div style={{background:"rgba(14,14,14,0.85)",backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 18px",
            fontSize:12,fontWeight:700,color:"#F0EFE8",display:"flex",alignItems:"center",gap:6,
            opacity:hov?1:0,transform:hov?"translateY(0)":"translateY(8px)",transition:"all 0.2s"}}>
            ◎ Preview Resume
          </div>
        </div>
        {/* Badges */}
        <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"3px 10px",
          fontSize:10,fontWeight:700,color:"#888",display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:thumbTpl.accent,flexShrink:0}}/>{templateName}
        </div>
        <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",
          border:`1px solid ${sc}33`,borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,color:sc}}>
          {resume.completionScore}%
        </div>
        {thumbTpl.isPremium&&<div style={{position:"absolute",bottom:10,right:10,background:"#92400E",color:"#FCD34D",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20}}>★ PRO</div>}
      </div>
      {/* Body */}
      <div style={{padding:"14px 16px 13px",flex:1,display:"flex",flexDirection:"column",fontFamily:"'Outfit',sans-serif"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:5}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:700,color:"#F0EFE8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{resume.title}</div>
            <div style={{fontSize:11,color:"#444",marginTop:2}}>{resume.personalInfo.title}</div>
          </div>
          <Ring score={resume.completionScore}/>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:9,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#333"}}>⏱ {relativeTime(resume.updatedAt)}</span>
          {resume.personalInfo.location&&<span style={{fontSize:10,color:"#333"}}>📍 {resume.personalInfo.location}</span>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
          {(["experience","education","skills","projects","certifications"] as const)
            .filter(k=>resume.sectionCounts[k]>0)
            .map(k=><span key={k} style={{fontSize:9.5,fontWeight:600,padding:"2px 7px",borderRadius:20,
              background:"#181818",color:"#444",border:"1px solid #222",textTransform:"capitalize"}}>
              {resume.sectionCounts[k]} {k.slice(0,4)}
            </span>)}
        </div>
        <div style={{display:"flex",gap:2,marginTop:"auto",background:"#0A0A0A",borderRadius:8,padding:"3px",border:"1px solid #191919"}}>
          <button type="button" onClick={()=>onEdit(resume.id)} style={{flex:1,border:0,background:"#111",color:"#CFCFCF",fontSize:11,fontWeight:700,padding:"7px 6px",borderRadius:6,cursor:"pointer"}}>
            ✎ Edit
          </button>
          <button type="button" onClick={()=>onPreview(resume.id)} style={{flex:1,border:0,background:"#111",color:"#CFCFCF",fontSize:11,fontWeight:700,padding:"7px 6px",borderRadius:6,cursor:"pointer"}}>
            ◎ Preview
          </button>
          <button type="button" onClick={()=>onDuplicate(resume.id)} style={{flex:1,border:0,background:"#111",color:"#CFCFCF",fontSize:11,fontWeight:700,padding:"7px 6px",borderRadius:6,cursor:"pointer"}}>
            ⊕ Copy
          </button>
          <button type="button" onClick={()=>onDelete(resume.id)} style={{flex:1,border:0,background:"#111",color:"#F87171",fontSize:11,fontWeight:700,padding:"7px 6px",borderRadius:6,cursor:"pointer"}}>
            ✕ Delete
          </button>
        </div>
      </div>
    </div>
  );
}