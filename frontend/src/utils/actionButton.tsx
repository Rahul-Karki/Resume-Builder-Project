import { useState } from "react";

export function Btn({ label,icon,onClick,danger=false }: {label:string;icon:string;onClick:()=>void;danger?:boolean}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={e=>{e.stopPropagation();onClick();}} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} title={label}
      style={{flex:1,padding:"6px 2px",background:h?(danger?"#7F1D1D":"#1E1E1E"):"transparent",border:"none",borderRadius:6,cursor:"pointer",
        fontFamily:"inherit",color:h?(danger?"#FCA5A5":"#C8C7C0"):"#3A3A3A",fontSize:10.5,fontWeight:600,
        display:"flex",alignItems:"center",justifyContent:"center",gap:3,transition:"all 0.12s"}}>
      <span style={{fontSize:12}}>{icon}</span>
      <span style={{fontSize:9.5}}>{label}</span>
    </button>
  );
}