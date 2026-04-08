export function Skeleton() {
  return (
    <div style={{background:"#111",border:"1px solid #191919",borderRadius:16,overflow:"hidden"}}>
      <div style={{height:210,background:"#0A0A0A",animation:"pulse 1.5s ease-in-out infinite"}}/>
      <div style={{padding:"14px 16px"}}>
        <div style={{height:14,background:"#1A1A1A",borderRadius:4,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}/>
        <div style={{height:11,background:"#141414",borderRadius:4,width:"55%",marginBottom:12,animation:"pulse 1.5s ease-in-out infinite"}}/>
        <div style={{display:"flex",gap:4,marginBottom:12}}>
          {[50,40,55].map((w,i)=><div key={i} style={{height:18,width:w,background:"#141414",borderRadius:20,animation:"pulse 1.5s ease-in-out infinite"}}/>)}
        </div>
        <div style={{height:34,background:"#0A0A0A",borderRadius:8,animation:"pulse 1.5s ease-in-out infinite"}}/>
      </div>
    </div>
  );
}