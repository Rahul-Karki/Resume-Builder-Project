import { SavedResume } from "@/types/resume-types";

export function DelModal({ resume,onConfirm,onCancel }: {resume:SavedResume;onConfirm:()=>void;onCancel:()=>void}) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onCancel();}}
      style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",fontFamily:"'Outfit',sans-serif"}}>
      <div style={{background:"#0F0F0F",border:"1px solid #1E1E1E",borderRadius:16,padding:"32px 28px",maxWidth:400,width:"90%",textAlign:"center"}}>
        <div style={{width:52,height:52,background:"rgba(127,29,29,0.3)",border:"1px solid #3A0000",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:22}}>🗑</div>
        <div style={{fontSize:17,fontWeight:800,color:"#F0EFE8",marginBottom:8}}>Delete this resume?</div>
        <div style={{fontSize:13,color:"#555",marginBottom:5,lineHeight:1.5}}>
          <span style={{color:"#888"}}>"{resume.title}"</span> will be permanently removed.
        </div>
        <div style={{fontSize:11,color:"#333",marginBottom:28}}>This action cannot be undone.</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px",borderRadius:9,border:"1px solid #2A2A2A",background:"transparent",color:"#888",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#DC2626",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}
 