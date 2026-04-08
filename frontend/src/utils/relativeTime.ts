export function relativeTime(iso: string): string {
  const d=Date.now()-new Date(iso).getTime(), m=Math.floor(d/60000), h=Math.floor(d/3600000), days=Math.floor(d/86400000);
  if(m<2) return "just now"; if(m<60) return m+"m ago"; if(h<24) return h+"h ago"; if(days<30) return days+"d ago";
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
 