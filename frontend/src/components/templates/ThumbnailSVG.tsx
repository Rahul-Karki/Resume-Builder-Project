import { JSX } from "react";
import { TemplateMeta } from "@/data/templateMeta";

export function ThumbnailSVG({ template }: { template: TemplateMeta }) {
  const id = template.id;
  const configs: Record<string, JSX.Element> = {
    classic: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FAF8F5" />
        <rect x="20" y="20" width="100" height="12" rx="2" fill="#1a1a1a" opacity="0.85" />
        <rect x="20" y="36" width="160" height="2" rx="1" fill="#555" opacity="0.4" />
        <rect x="20" y="50" width="200" height="1.5" fill="#1a1a1a" opacity="0.8" />
        <rect x="20" y="57" width="200" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        <rect x="20" y="62" width="180" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        <rect x="20" y="67" width="190" height="1.8" rx="0.5" fill="#333" opacity="0.12" />
        {[85,100,118,136].map((y, i) => (
          <g key={y}>
            <rect x="20" y={y} width="42" height="3.5" rx="1" fill="#1a1a1a" opacity="0.55" />
            <rect x="20" y={y + 7} width="200" height="0.75" fill="#ccc" />
            <rect x="20" y={y + 11} width={[145, 130, 138, 125][i]} height="1.8" rx="0.5" fill="#333" opacity="0.15" />
            <rect x="20" y={y + 15} width={[200, 185, 195, 180][i]} height="1.8" rx="0.5" fill="#333" opacity="0.12" />
            <rect x="20" y={y + 19} width={[190, 170, 180, 165][i]} height="1.8" rx="0.5" fill="#333" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    executive: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#EEF1F7" />
        <rect x="0" y="0" width="240" height="62" fill="#1B2B4B" />
        <rect x="18" y="14" width="120" height="14" rx="2" fill="#F1F5F9" opacity="0.9" />
        <rect x="18" y="32" width="80" height="2.5" rx="1" fill="#A8BDD8" opacity="0.7" />
        <rect x="18" y="40" width="160" height="2" rx="0.5" fill="#A8BDD8" opacity="0.35" />
        <rect x="18" y="48" width="130" height="2" rx="0.5" fill="#A8BDD8" opacity="0.25" />
        {[72, 100, 128, 156, 180, 204, 232, 260].map((y, i) => (
          <g key={y}>
            {i % 3 === 0 && <><rect x="18" y={y} width="50" height="4" rx="1" fill="#1B2B4B" opacity="0.6" /><rect x="18" y={y + 6} width="204" height="0.75" fill="#1B2B4B" opacity="0.2" /></>}
            <rect x="18" y={y + (i % 3 === 0 ? 10 : 0)} width={[180, 155, 170, 160, 140, 165, 150, 145][i]} height="1.8" rx="0.5" fill="#1B2B4B" opacity="0.13" />
            <rect x="18" y={y + (i % 3 === 0 ? 14 : 4)} width={[200, 170, 185, 175, 158, 180, 165, 160][i]} height="1.8" rx="0.5" fill="#1B2B4B" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    modern: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F0FDFB" />
        <rect x="0" y="0" width="4" height="310" fill="#0F766E" opacity="0.3" />
        <rect x="16" y="14" width="100" height="13" rx="2" fill="#0F1A14" opacity="0.8" />
        <rect x="16" y="31" width="70" height="3" rx="1" fill="#555" opacity="0.45" />
        <rect x="16" y="39" width="180" height="2" rx="0.5" fill="#333" opacity="0.15" />
        {[58, 92, 130, 168, 206, 248, 275].map((y, i) => (
          <g key={y}>
            <rect x="8" y={y} width="3" height={i < 5 ? 36 : 22} rx="1.5" fill="#0F766E" opacity="0.4" />
            <rect x="16" y={y} width="45" height="3.5" rx="1" fill="#0F766E" opacity="0.65" />
            <rect x="16" y={y + 7} width={[180, 165, 170, 155, 160, 140, 150][i]} height="1.8" rx="0.5" fill="#134E4A" opacity="0.15" />
            <rect x="16" y={y + 12} width={[200, 175, 185, 165, 175, 155, 165][i]} height="1.8" rx="0.5" fill="#134E4A" opacity="0.12" />
            {i < 5 && <rect x="16" y={y + 17} width={[190, 160, 175, 150, 165][i] ?? 150} height="1.8" rx="0.5" fill="#134E4A" opacity="0.10" />}
          </g>
        ))}
      </svg>
    ),
    compact: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F8F8F8" />
        <rect x="18" y="16" width="90" height="11" rx="2" fill="#111" opacity="0.8" />
        <rect x="18" y="31" width="160" height="1.8" rx="0.5" fill="#444" opacity="0.4" />
        <rect x="18" y="40" width="204" height="0.75" fill="#111" opacity="0.6" />
        {[50, 72, 96, 120, 148, 172, 196, 220, 248, 270].map((y, i) => (
          <g key={y}>
            <rect x="18" y={y} width="70" height="2" rx="0.5" fill="#555" opacity="0.5" />
            <rect x="98" y={y} width="0.5" height="2" fill="#ccc" />
            <rect x="104" y={y} width={[112, 100, 108, 95, 110, 100, 105, 95, 108, 100][i]} height="2" rx="0.5" fill="#222" opacity="0.15" />
            <rect x="104" y={y + 5} width={[120, 108, 115, 102, 118, 108, 112, 100, 116, 108][i]} height="1.5" rx="0.5" fill="#222" opacity="0.10" />
            {i % 3 === 2 && <rect x="18" y={y + 12} width="204" height="0.5" fill="#ddd" />}
          </g>
        ))}
      </svg>
    ),
    sidebar: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#fff" />
        <rect x="0" y="0" width="76" height="310" fill="#1E293B" />
        <rect x="10" y="16" width="56" height="56" rx="28" fill="#334155" />
        <rect x="14" y="78" width="48" height="5" rx="2" fill="#CBD5E1" opacity="0.7" />
        <rect x="18" y="87" width="40" height="3" rx="1" fill="#94A3B8" opacity="0.5" />
        <rect x="10" y="100" width="56" height="0.75" fill="#334155" />
        {[48, 54, 44, 52, 46].map((width, index) => <rect key={index} x="10" y={108 + index * 8} width={width} height="2.5" rx="1" fill="#475569" opacity="0.55" />)}
        <rect x="10" y="154" width="56" height="0.75" fill="#334155" />
        <rect x="10" y="162" width="56" height="3" rx="1" fill="#64748B" opacity="0.4" />
        {[170, 178, 186, 194, 202, 210].map((y) => <rect key={y} x="10" y={y} width={24 + (y % 16)} height="8" rx="4" fill="#334155" />)}
        <rect x="10" y="228" width="56" height="0.75" fill="#334155" />
        {[236, 244, 252].map((y) => <rect key={y} x="10" y={y} width="52" height="2.5" rx="1" fill="#475569" opacity="0.4" />)}
        <rect x="88" y="16" width="136" height="9" rx="2" fill="#1E293B" opacity="0.75" />
        <rect x="88" y="28" width="100" height="3" rx="1" fill="#475569" opacity="0.4" />
        <rect x="88" y="40" width="144" height="1" fill="#1E293B" opacity="0.15" />
        {[46, 53, 60].map(y => <rect key={y} x="88" y={y} width={144 - (y - 46) * 2} height="1.8" rx="0.5" fill="#334155" opacity="0.18" />)}
        <rect x="88" y="74" width="60" height="5.5" rx="1" fill="#1E293B" opacity="0.65" />
        <rect x="88" y="82" width="144" height="0.75" fill="#1E293B" opacity="0.2" />
        {[88, 100, 114, 128, 142, 158, 172, 186, 200, 214, 228, 242, 256, 270, 284].map((y, i) => (
          <rect key={y} x="88" y={y} width={[136, 120, 128, 112, 136, 122, 128, 114, 132, 110, 124, 116, 130, 112, 128][i] ?? 120} height="2" rx="0.5" fill="#334155" opacity="0.18" />
        ))}
      </svg>
    ),
    scholarly: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FFFFFF" />
        <rect x="48" y="14" width="144" height="11" rx="2" fill="#1a1a1a" opacity="0.82" />
        <rect x="32" y="29" width="176" height="2" rx="1" fill="#4a4a4a" opacity="0.36" />
        {[42, 49, 56].map((y, i) => <rect key={y} x="20" y={y} width={[200, 184, 196][i]} height="1.8" rx="1" fill="#1a1a1a" opacity="0.12" />)}
        {[72, 108, 146, 184, 222, 258].map((y) => (
          <g key={y}>
            <rect x="20" y={y} width="54" height="3.4" rx="1" fill="#1a1a1a" opacity="0.56" />
            <rect x="20" y={y + 6} width="200" height="0.75" fill="#4a4a4a" opacity="0.28" />
            <rect x="20" y={y + 10} width="188" height="1.8" rx="1" fill="#1a1a1a" opacity="0.13" />
            <rect x="20" y={y + 15} width="198" height="1.8" rx="1" fill="#1a1a1a" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    research: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FFFFFF" />
        <rect x="16" y="14" width="144" height="12" rx="2" fill="#0B3B5C" opacity="0.82" />
        <rect x="16" y="28" width="96" height="3" rx="1" fill="#0B3B5C" opacity="0.42" />
        <rect x="16" y="38" width="208" height="1" fill="#0B3B5C" opacity="0.14" />
        {[48, 56, 64].map((y, i) => <rect key={y} x="16" y={y} width={[200, 185, 195][i]} height="1.8" rx="1" fill="#0B3B5C" opacity="0.12" />)}
        {[86, 124, 164, 204, 244].map((y) => (
          <g key={y}>
            <rect x="16" y={y} width="50" height="3.5" rx="1" fill="#0B3B5C" opacity="0.55" />
            <rect x="16" y={y + 6} width="208" height="0.75" fill="#0B3B5C" opacity="0.24" />
            <rect x="16" y={y + 10} width="190" height="1.8" rx="1" fill="#0B3B5C" opacity="0.13" />
            <rect x="16" y={y + 15} width="200" height="1.8" rx="1" fill="#0B3B5C" opacity="0.10" />
          </g>
        ))}
      </svg>
    ),
    chronological: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FAFAFA" />
        <rect x="20" y="14" width="120" height="13" rx="2" fill="#1a1a1a" opacity="0.82" />
        <rect x="20" y="30" width="180" height="2" rx="1" fill="#555" opacity="0.35" />
        <rect x="20" y="40" width="200" height="0.75" fill="#1a1a1a" opacity="0.18" />
        {[52, 72, 94, 118, 144, 170, 200, 228, 258].map((y, i) => (
          <g key={y}>
            <rect x="20" y={y} width="80" height="2.4" rx="1" fill="#555" opacity="0.45" />
            <rect x="20" y={y + 5} width={[180, 165, 172, 158, 175, 155, 168, 148, 162][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.13" />
            <rect x="20" y={y + 10} width={[200, 185, 192, 178, 195, 175, 188, 168, 182][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.10" />
            {i < 6 && <rect x="20" y={y + 15} width={[190, 175, 182, 168, 185, 165][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.08" />}
          </g>
        ))}
      </svg>
    ),
    "community-impact": (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F8F6F0" />
        <rect x="0" y="0" width="240" height="68" fill="#2D4A3E" />
        <rect x="18" y="16" width="110" height="13" rx="2" fill="#E8EDE4" opacity="0.9" />
        <rect x="18" y="33" width="75" height="3" rx="1" fill="#A8C5B2" opacity="0.6" />
        <rect x="18" y="41" width="180" height="2" rx="0.5" fill="#A8C5B2" opacity="0.3" />
        {[78, 105, 132, 160, 190, 220, 252].map((y, i) => (
          <g key={y}>
            <rect x="18" y={y} width="38" height="3.2" rx="1" fill="#2D4A3E" opacity="0.55" />
            <rect x="18" y={y + 6} width="204" height="0.75" fill="#2D4A3E" opacity="0.18" />
            <rect x="18" y={y + 10} width={[180, 165, 170, 155, 175, 160, 168][i]} height="1.8" rx="0.5" fill="#2D4A3E" opacity="0.12" />
            <rect x="18" y={y + 15} width={[200, 185, 192, 178, 195, 180, 188][i]} height="1.8" rx="0.5" fill="#2D4A3E" opacity="0.09" />
          </g>
        ))}
      </svg>
    ),
    combination: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#F5F7FA" />
        <rect x="16" y="14" width="130" height="12" rx="2" fill="#1E2A4A" opacity="0.8" />
        <rect x="16" y="29" width="170" height="2" rx="1" fill="#1E2A4A" opacity="0.35" />
        <rect x="16" y="38" width="208" height="0.75" fill="#1E2A4A" opacity="0.15" />
        {[50, 65, 80, 98].map((y) => (
          <g key={y}>
            <rect x="16" y={y} width={[200, 185, 195, 180][[50,65,80,98].indexOf(y)]} height="2" rx="1" fill="#1E2A4A" opacity="0.12" />
          </g>
        ))}
        <rect x="16" y="110" width="80" height="3.5" rx="1" fill="#1E2A4A" opacity="0.5" />
        <rect x="16" y="116" width="208" height="0.75" fill="#1E2A4A" opacity="0.2" />
        {[125, 133, 141].map(y => <rect key={y} x="16" y={y} width={[180, 192, 175][[125,133,141].indexOf(y)]} height="1.8" rx="1" fill="#1E2A4A" opacity="0.12" />)}
        {[160, 196, 234, 270].map((y, i) => (
          <g key={y}>
            <rect x="16" y={y} width={40 + i * 5} height="3.2" rx="1" fill="#1E2A4A" opacity="0.5" />
            <rect x="16" y={y + 6} width="208" height="0.75" fill="#1E2A4A" opacity="0.18" />
            <rect x="16" y={y + 10} width={[185, 195, 175, 188][i]} height="1.8" rx="1" fill="#1E2A4A" opacity="0.12" />
            <rect x="16" y={y + 15} width={[200, 208, 195, 202][i]} height="1.8" rx="1" fill="#1E2A4A" opacity="0.09" />
          </g>
        ))}
      </svg>
    ),
    functional: (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FFFFFF" />
        <rect x="60" y="14" width="120" height="12" rx="2" fill="#222" opacity="0.82" />
        <rect x="40" y="30" width="160" height="2" rx="1" fill="#444" opacity="0.35" />
        <rect x="20" y="40" width="16" height="16" rx="3" fill="#4F46E5" opacity="0.6" />
        <rect x="42" y="42" width="80" height="4" rx="1" fill="#222" opacity="0.6" />
        <rect x="42" y="49" width="178" height="1.8" rx="0.5" fill="#222" opacity="0.12" />
        {[60, 72, 84].map(y => <rect key={y} x="42" y={y} width={[160, 175, 150][[60,72,84].indexOf(y)]} height="1.8" rx="0.5" fill="#222" opacity="0.10" />)}
        {[105, 115, 125].map(y => <rect key={y} x="20" y={y} width="16" height="16" rx="3" fill="#4F46E5" opacity="0.6" />)}
        <rect x="42" y="107" width="100" height="4" rx="1" fill="#222" opacity="0.6" />
        <rect x="42" y="114" width="178" height="1.8" rx="0.5" fill="#222" opacity="0.12" />
        {[125, 137, 149].map(y => <rect key={y} x="42" y={y} width={[170, 185, 160][[125,137,149].indexOf(y)]} height="1.8" rx="0.5" fill="#222" opacity="0.10" />)}
        {[177, 192, 210, 228, 246, 264].map((y, i) => (
          <g key={y}>
            {i % 2 === 0 && <rect x="20" y={y} width="16" height="16" rx="3" fill="#4F46E5" opacity="0.6" />}
            <rect x="42" y={y + (i % 2 === 0 ? 2 : 0)} width={[95, 150, 85, 165, 75, 160][i]} height="4" rx="1" fill="#222" opacity={i % 2 === 0 ? 0.6 : 0.1} />
            {i % 2 === 0 && <rect x="42" y={y + 9} width={[175, 185, 165][Math.floor(i / 2)]} height="1.8" rx="0.5" fill="#222" opacity="0.10" />}
          </g>
        ))}
      </svg>
    ),
    "traditional-assistant": (
      <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="310" fill="#FCFCFC" />
        <rect x="20" y="14" width="140" height="12" rx="2" fill="#1a1a1a" opacity="0.82" />
        <rect x="20" y="30" width="200" height="1.5" rx="0.5" fill="#555" opacity="0.3" />
        <rect x="20" y="40" width="200" height="0.75" fill="#1a1a1a" opacity="0.15" />
        {[50, 58, 66].map((y, i) => <rect key={y} x="20" y={y} width={[180, 195, 170][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.12" />)}
        {[84, 112, 142, 172, 204, 234, 264].map((y, i) => (
          <g key={y}>
            <rect x="20" y={y} width="60" height="3.4" rx="1" fill="#1a1a1a" opacity="0.5" />
            <rect x="20" y={y + 6} width="200" height="0.75" fill="#1a1a1a" opacity="0.18" />
            <rect x="20" y={y + 10} width={[185, 170, 178, 190, 165, 182, 175][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.12" />
            <rect x="20" y={y + 15} width={[200, 190, 195, 205, 185, 198, 192][i]} height="1.8" rx="0.5" fill="#1a1a1a" opacity="0.09" />
          </g>
        ))}
      </svg>
    ),
  };

  return configs[id] ?? configs.classic;
}
