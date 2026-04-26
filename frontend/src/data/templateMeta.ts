export interface TemplateMeta {
  id: string;
  name: string;
  tag: string;
  category: string;
  accent: string;
  font: string;
  description: string;
  isPremium: boolean;
  palette: string[];
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
  { id: "classic",   name: "Classic",   tag: "Timeless",    category: "Professional", accent: "#1a1a1a", font: "EB Garamond",      description: "Clean serif typography trusted by finance, law & academia.", isPremium: false, palette: ["#FAF8F5","#1a1a1a","#555555"] },
  { id: "executive", name: "Executive", tag: "Corporate",   category: "Corporate",    accent: "#1B2B4B", font: "Playfair Display",  description: "Navy header with strong hierarchy for leadership roles.",     isPremium: false, palette: ["#EEF1F7","#1B2B4B","#3A5A8A"] },
  { id: "modern",    name: "Modern",    tag: "Tech-Ready",  category: "Technical",    accent: "#0F766E", font: "DM Sans",           description: "Teal accent rule and skill chips. Built for tech & startups.", isPremium: false, palette: ["#F0FDFB","#0F766E","#134E4A"] },
  { id: "compact",   name: "Compact",   tag: "One-Page",    category: "Senior",       accent: "#111111", font: "IBM Plex",          description: "Information-dense label-column layout for senior candidates.", isPremium: true,  palette: ["#F8F8F8","#111111","#444444"] },
  { id: "sidebar",   name: "Sidebar",   tag: "Structured",  category: "Creative",     accent: "#1E293B", font: "Nunito",            description: "Dark sidebar with two-column structure. Striking and scannable.", isPremium: true, palette: ["#1E293B","#F1F5F9","#94A3B8"] },
  { id: "scholarly", name: "Scholarly", tag: "Academic",    category: "Academic",     accent: "#1a1a1a", font: "EB Garamond",      description: "Centered academic layout with classic headings and balanced spacing.", isPremium: false, palette: ["#FFFFFF","#1a1a1a","#4a4a4a"] },
  { id: "research",  name: "Research",  tag: "Detailed",    category: "Academic",     accent: "#1f1f1f", font: "Playfair Display", description: "Publication-style hierarchy tuned for research-heavy resumes.", isPremium: false, palette: ["#FFFFFF","#1f1f1f","#555555"] },
];