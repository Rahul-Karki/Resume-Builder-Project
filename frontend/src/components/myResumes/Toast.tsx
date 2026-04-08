export function Toast({ msg }: { msg: string }) {
  return (
    <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",
      background:"#161616",color:"#F0EFE8",padding:"10px 22px",borderRadius:24,
      fontSize:13,fontWeight:600,border:"1px solid #2A2A2A",
      boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:300,fontFamily:"'Outfit',sans-serif",
      display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap",animation:"toastIn 0.2s ease"}}>
      <span style={{color:"#4ADE80",fontSize:14}}>✓</span>{msg}
    </div>
  );
}
 