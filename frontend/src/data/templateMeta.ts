export interface TemplateMeta {
  id: string;
  name: string;
  tag: string;
  category: string;
  audience: "tech" | "non-tech";
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
  { id: "classic",   name: "Classic",   tag: "Timeless",    category: "Professional", audience: "non-tech", accent: "#1a1a1a", font: "EB Garamond",      description: "Clean serif typography trusted by finance, law & academia.", isPremium: false, palette: ["#FAF8F5","#1a1a1a","#555555"] },
  { id: "executive", name: "Executive", tag: "Corporate",   category: "Corporate",    audience: "non-tech", accent: "#1B2B4B", font: "Playfair Display",  description: "Navy header with strong hierarchy for leadership roles.",     isPremium: false, palette: ["#EEF1F7","#1B2B4B","#3A5A8A"] },
  { id: "modern",    name: "Modern",    tag: "Tech-Ready",  category: "Technical",    audience: "tech",     accent: "#0F766E", font: "DM Sans",           description: "Teal accent rule and skill chips. Built for tech & startups.", isPremium: false, palette: ["#F0FDFB","#0F766E","#134E4A"] },
  { id: "compact",   name: "Compact",   tag: "One-Page",    category: "Senior",       audience: "non-tech", accent: "#111111", font: "IBM Plex",          description: "Information-dense label-column layout for senior candidates.", isPremium: true,  palette: ["#F8F8F8","#111111","#444444"] },
  { id: "sidebar",   name: "Sidebar",   tag: "Structured",  category: "Creative",     audience: "tech",     accent: "#1E293B", font: "Nunito",            description: "Dark sidebar with two-column structure. Striking and scannable.", isPremium: true, palette: ["#1E293B","#F1F5F9","#94A3B8"] },
  { id: "scholarly", name: "Scholarly", tag: "Academic",    category: "Academic",     audience: "non-tech", accent: "#1a1a1a", font: "EB Garamond",      description: "Centered academic layout with classic headings and balanced spacing.", isPremium: false, palette: ["#FFFFFF","#1a1a1a","#4a4a4a"] },
  { id: "research",  name: "Research",  tag: "Detailed",    category: "Academic",     audience: "non-tech", accent: "#1f1f1f", font: "Playfair Display", description: "Publication-style hierarchy tuned for research-heavy resumes.", isPremium: false, palette: ["#FFFFFF","#1f1f1f","#555555"] },
  { id: "administrative", name: "Administrative", tag: "Office", category: "Professional", audience: "non-tech", accent: "#374151", font: "IBM Plex Sans", description: "Straightforward ATS-safe layout for office, coordination, and support roles.", isPremium: false, palette: ["#FFFFFF","#374151","#6B7280"] },
  { id: "operations", name: "Operations", tag: "Process", category: "Corporate", audience: "non-tech", accent: "#0F4C5C", font: "IBM Plex Sans", description: "Balanced one-page template for operations, logistics, and program delivery roles.", isPremium: false, palette: ["#F7FBFC","#0F4C5C","#52707A"] },
  { id: "customer-service", name: "Customer Service", tag: "Service", category: "Professional", audience: "non-tech", accent: "#1D4ED8", font: "Outfit", description: "Friendly, high-clarity layout for service, support, and client-facing applications.", isPremium: false, palette: ["#F8FAFC","#1D4ED8","#64748B"] },
  { id: "healthcare", name: "Healthcare", tag: "Care", category: "Professional", audience: "non-tech", accent: "#0F766E", font: "Source Serif 4", description: "ATS-friendly resume tuned for patient care, clinic, and allied health roles.", isPremium: true, palette: ["#F5FBFA","#0F766E","#5B7C78"] },
  { id: "education", name: "Education", tag: "Teaching", category: "Academic", audience: "non-tech", accent: "#7C2D12", font: "Lora", description: "Clean academic-adjacent layout for teaching, counseling, and campus support roles.", isPremium: true, palette: ["#FFFCFA","#7C2D12","#78716C"] },
];
