export function Ring({ score }: { score: number }) {
  const r=11, c=2*Math.PI*r, f=(score/100)*c;
  const col = score>=80?"#4ADE80":score>=50?"#F59E0B":"#F87171";
  return (
    <div title={score+"% complete"} style={{position:"relative",width:30,height:30,flexShrink:0}}>
      <svg width="30" height="30" viewBox="0 0 30 30" style={{transform:"rotate(-90deg)"}}>
        <circle cx="15" cy="15" r={r} fill="none" stroke="#1E1E1E" strokeWidth="2.5"/>
        <circle cx="15" cy="15" r={r} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={`${f} ${c-f}`} strokeLinecap="round"/>
      </svg>
      <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7.5,fontWeight:800,color:col}}>{score}</span>
    </div>
  );
}