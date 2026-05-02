export interface TemplateMeta {
  id: string;
  name: string;
  tag: string;
  category: "tech" | "non-tech";
  audience: "tech" | "non-tech";
  accent: string;
  font: string;
  description: string;
  isPremium: boolean;
  palette: string[];
  thumbnailUrl?: string;
  cssVars?: {
    accentColor?: string;
    headingColor?: string;
    textColor?: string;
    mutedColor?: string;
    borderColor?: string;
    backgroundColor?: string;
    bodyFont?: string;
    headingFont?: string;
    fontSize?: string;
    lineHeight?: string;
  };
  slots?: {
    summary?: boolean;
    experience?: boolean;
    education?: boolean;
    skills?: boolean;
    projects?: boolean;
    certifications?: boolean;
    languages?: boolean;
  };
}

export const templates: TemplateMeta[] = [
  { id: "classic",   name: "Classic",   tag: "Timeless",    category: "non-tech", audience: "non-tech", accent: "#1a1a1a", font: "EB Garamond",      description: "Clean serif typography trusted by finance, law & academia.", isPremium: false, palette: ["#FAF8F5","#1a1a1a","#555555"] },
  { id: "executive", name: "Executive", tag: "Corporate",   category: "non-tech", audience: "non-tech", accent: "#1B2B4B", font: "Playfair Display",  description: "Navy header with strong hierarchy for leadership roles.",     isPremium: false, palette: ["#EEF1F7","#1B2B4B","#3A5A8A"] },
  { id: "modern",    name: "Modern",    tag: "Tech-Ready",  category: "tech",     audience: "tech",     accent: "#0F766E", font: "DM Sans",           description: "Teal accent rule and skill chips. Built for tech & startups.", isPremium: false, palette: ["#F0FDFB","#0F766E","#134E4A"] },
  { id: "compact",   name: "Compact",   tag: "One-Page",    category: "non-tech", audience: "non-tech", accent: "#111111", font: "IBM Plex",          description: "Information-dense label-column layout for senior candidates.", isPremium: true,  palette: ["#F8F8F8","#111111","#444444"] },
  { id: "sidebar",   name: "Sidebar",   tag: "Structured",  category: "tech",     audience: "tech",     accent: "#1E293B", font: "Nunito",            description: "Dark sidebar with two-column structure. Striking and scannable.", isPremium: true, palette: ["#1E293B","#F1F5F9","#94A3B8"] },
  { id: "scholarly", name: "Scholarly", tag: "Academic",    category: "non-tech", audience: "non-tech", accent: "#1a1a1a", font: "EB Garamond",      description: "Centered academic layout with classic headings and balanced spacing.", isPremium: false, palette: ["#FFFFFF","#1a1a1a","#4a4a4a"] },
  { id: "research",  name: "Research",  tag: "Detailed",    category: "non-tech", audience: "non-tech", accent: "#1f1f1f", font: "Playfair Display", description: "Publication-style hierarchy tuned for research-heavy resumes.", isPremium: false, palette: ["#FFFFFF","#1f1f1f","#555555"] },
  { id: "chronological", name: "Chronological", tag: "ATS Core", category: "non-tech", audience: "non-tech", accent: "#1F2937", font: "IBM Plex Sans", description: "Reverse-chronological ATS layout highlighting role progression for business and office careers.", isPremium: false, palette: ["#FCFCFB","#1F2937","#6B7280"] },
  { id: "functional", name: "Functional", tag: "Skills-First", category: "non-tech", audience: "non-tech", accent: "#334155", font: "Outfit", description: "Skills-first ATS-safe resume for career pivots, return-to-work, and experience gaps.", isPremium: false, palette: ["#F8FAFC","#334155","#64748B"] },
  { id: "combination", name: "Combination", tag: "Hybrid", category: "non-tech", audience: "non-tech", accent: "#0B3C5D", font: "Playfair Display", description: "Hybrid ATS format balancing measurable achievements and transferable strengths.", isPremium: true, palette: ["#F8FAFF","#0B3C5D","#64748B"] },
  { id: "traditional-assistant", name: "Traditional Assistant", tag: "Admin", category: "non-tech", audience: "non-tech", accent: "#1E3A8A", font: "IBM Plex Sans", description: "Administrative-assistant inspired ATS template focused on office operations and coordination.", isPremium: false, palette: ["#F8FAFF","#1E3A8A","#64748B"] },
  { id: "community-impact", name: "Community Impact", tag: "Volunteer", category: "non-tech", audience: "non-tech", accent: "#166534", font: "Lora", description: "Simple ATS-ready format for volunteer, NGO, education support, and public-service resumes.", isPremium: false, palette: ["#F0FDF4","#166534","#6B7280"] },
];
