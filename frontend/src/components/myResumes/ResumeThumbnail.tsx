import { TemplateMeta } from "@/types/resume-types";
import { JSX } from "react";


export function Thumb({ t, size="card" }: { t: TemplateMeta; size?: "card"|"modal" }) {
  const vw=240, vh=310, s=1, p=t.palette;
  const Classic = () => (<>
    <rect width={vw} height={vh} fill={p.bg}/>
    <rect x="20" y="18" width="88" height="11" rx="2" fill={p.primary} opacity="0.85"/>
    <rect x="20" y="33" width="155" height="2" rx="1" fill={p.secondary} opacity="0.4"/>
    <rect x="20" y="42" width="200" height="1.5" fill={p.primary} opacity="0.7"/>
    {[50,57,64].map((y,i)=><rect key={y} x="20" y={y} width={[200,175,185][i]} height="2" rx="1" fill={p.primary} opacity="0.11"/>)}
    {[78,112,150,188,224].map((y,si)=>(<g key={y}>
      <rect x="20" y={y} width="48" height="4" rx="1.5" fill={p.primary} opacity="0.48"/>
      <rect x="20" y={y+6} width="200" height="0.75" fill={p.secondary} opacity="0.28"/>
      {[0,1,2].map(li=><rect key={li} x="24" y={y+10+li*7} width={[200,172,184][li]} height="2" rx="1" fill={p.primary} opacity={si===0?0.14:0.10}/>)}
    </g>))}
  </>);
  const Executive = () => (<>
    <rect width={vw} height={vh} fill={p.bg}/>
    <rect x="0" y="0" width={vw} height="58" fill={p.primary}/>
    <rect x="17" y="11" width="108" height="13" rx="2" fill="#F1F5F9" opacity="0.9"/>
    <rect x="17" y="28" width="78" height="2.5" rx="1" fill="#A8BDD8" opacity="0.7"/>
    <rect x="17" y="37" width="158" height="2" rx="1" fill="#A8BDD8" opacity="0.35"/>
    <rect x="17" y="46" width="128" height="2" rx="1" fill="#A8BDD8" opacity="0.25"/>
    {[68,98,128,162,196,228,256].map((y,i)=>(<g key={y}>
      {i%3===0&&<><rect x="17" y={y} width="48" height="4" rx="1.5" fill={p.primary} opacity="0.58"/><rect x="17" y={y+6} width="204" height="0.75" fill={p.primary} opacity="0.18"/></>}
      <rect x="17" y={y+(i%3===0?10:0)} width={[178,153,168,158,138,163,148][i]} height="2" rx="1" fill={p.primary} opacity="0.13"/>
      <rect x="17" y={y+(i%3===0?14:4)} width={[198,168,183,173,156,178,163][i]} height="2" rx="1" fill={p.primary} opacity="0.10"/>
    </g>))}
  </>);
  const Modern = () => (<>
    <rect width={vw} height={vh} fill={p.bg}/>
    <rect x="0" y="0" width="4" height={vh} fill={p.primary} opacity="0.28"/>
    <rect x="13" y="13" width="98" height="13" rx="2" fill="#0F1A14" opacity="0.8"/>
    <rect x="13" y="30" width="68" height="3" rx="1" fill={p.secondary} opacity="0.45"/>
    <rect x="13" y="38" width="178" height="2" rx="1" fill={p.primary} opacity="0.14"/>
    {[56,90,130,170,206,244].map((y,i)=>(<g key={y}>
      <rect x="7" y={y} width="3" height={i<5?34:20} rx="1.5" fill={p.primary} opacity="0.33"/>
      <rect x="13" y={y} width="44" height="4" rx="1.5" fill={p.primary} opacity="0.62"/>
      <rect x="13" y={y+8} width={[178,163,168,153,158,138][i]} height="2" rx="1" fill={p.secondary} opacity="0.17"/>
      <rect x="13" y={y+13} width={[198,173,183,163,173,153][i]} height="2" rx="1" fill={p.secondary} opacity="0.12"/>
      {i===3&&[0,1,2,3].map(ci=><rect key={ci} x={13+ci*36} y={y+22} width="32" height="7" rx="3.5" fill={p.primary} opacity="0.1"/>)}
    </g>))}
  </>);
  const Compact = () => (<>
    <rect width={vw} height={vh} fill={p.bg}/>
    <rect x="17" y="15" width="88" height="11" rx="2" fill={p.primary} opacity="0.8"/>
    <rect x="17" y="30" width="158" height="1.8" rx="1" fill={p.secondary} opacity="0.38"/>
    <rect x="17" y="39" width="204" height="0.75" fill={p.primary} opacity="0.55"/>
    {[48,66,84,102,120,138,156,174,192,210,228,246,264].map((y,i)=>(<g key={y}>
      <rect x="17" y={y} width="68" height="2" rx="1" fill={p.secondary} opacity="0.42"/>
      <rect x="98" y={y} width={[110,98,106,93,108,98,103,93,106,98,104,96,102][i]} height="2" rx="1" fill={p.primary} opacity="0.14"/>
      <rect x="98" y={y+5} width={[118,106,113,100,116,106,110,98,114,106,111,101,108][i]} height="1.5" rx="1" fill={p.primary} opacity="0.09"/>
    </g>))}
  </>);
  const Sidebar = () => { const sw=74; return (<>
    <rect width={vw} height={vh} fill="#fff"/>
    <rect x="0" y="0" width={sw} height={vh} fill="#1E293B"/>
    <rect x="9" y="14" width={sw-18} height={sw-18} rx={(sw-18)/2} fill="#334155"/>
    <rect x="9" y={sw-4} width={sw-18} height="5" rx="2" fill="#CBD5E1" opacity="0.7"/>
    <rect x="13" y={sw+5} width={sw-26} height="3" rx="1.5" fill="#94A3B8" opacity="0.5"/>
    {[sw+16,sw+54,sw+94,sw+140].map((y)=>(<g key={y}>
      <rect x="9" y={y-2} width={sw-18} height="0.75" fill="#334155"/>
      {[0,1,2,3].map(li=><rect key={li} x="9" y={y+li*8} width={28+li*4} height="2.5" rx="1.5" fill="#475569" opacity="0.52"/>)}
    </g>))}
    {[0,1,2,3,4,5].map(ci=><rect key={ci} x={9+(ci%3)*22} y={sw+118+Math.floor(ci/3)*11} width="18" height="7" rx="3.5" fill="#334155"/>)}
    <rect x={sw+11} y="15" width="133" height="9" rx="2" fill="#1E293B" opacity="0.72"/>
    <rect x={sw+11} y="27" width="98" height="3" rx="1.5" fill="#475569" opacity="0.38"/>
    {[43,86,144,206,256].map((y)=>(<g key={y}>
      <rect x={sw+11} y={y} width="58" height="5.5" rx="1.5" fill="#1E293B" opacity="0.62"/>
      <rect x={sw+11} y={y+7} width={vw-sw-22} height="0.75" fill="#1E293B" opacity="0.18"/>
      {[0,1,2,3].map(li=><rect key={li} x={sw+11} y={y+10+li*8} width={vw-sw-34} height="2" rx="1" fill="#334155" opacity="0.16"/>)}
    </g>))}
  </>); };
  const map: Record<string,JSX.Element> = { classic:<Classic/>, executive:<Executive/>, modern:<Modern/>, compact:<Compact/>, sidebar:<Sidebar/> };
  const isModal = size==="modal";
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} style={{width:"100%",height:"100%",display:"block"}} xmlns="http://www.w3.org/2000/svg">
      {map[t.id]??<rect width={vw} height={vh} fill="#f0f0f0"/>}
    </svg>
  );
}