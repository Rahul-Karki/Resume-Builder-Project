import { TemplateMeta } from "@/types/resume-types";

export const TEMPLATES: TemplateMeta[] = [
  { id:"classic",   name:"Classic",   tag:"Timeless",   category:"Professional", description:"Timeless serif layout trusted by finance, law & academia.", isPremium:false, accent:"#1a1a1a", palette:{bg:"#FAF8F5",primary:"#1a1a1a",secondary:"#555555"} },
  { id:"executive", name:"Executive", tag:"Corporate",  category:"Corporate",    description:"Navy header bar with strong hierarchy for leadership roles.", isPremium:false, accent:"#1B2B4B", palette:{bg:"#EEF1F7",primary:"#1B2B4B",secondary:"#3A5A8A"} },
  { id:"modern",    name:"Modern",    tag:"Tech-Ready", category:"Technical",    description:"Teal accent rule and skill chips built for tech startups.", isPremium:false, accent:"#0F766E", palette:{bg:"#F0FDFB",primary:"#0F766E",secondary:"#134E4A"} },
  { id:"compact",   name:"Compact",   tag:"One-Page",   category:"Senior",       description:"Information-dense label-column layout for senior candidates.", isPremium:true, accent:"#111111", palette:{bg:"#F8F8F8",primary:"#111111",secondary:"#444444"} },
  { id:"sidebar",   name:"Sidebar",   tag:"Structured", category:"Creative",     description:"Dark sidebar with two-column structure — striking and scannable.", isPremium:true, accent:"#1E293B", palette:{bg:"#ffffff",primary:"#1E293B",secondary:"#94A3B8",sidebar:"#1E293B"} },
  { id:"scholarly", name:"Scholarly", tag:"Academic",   category:"Academic",     description:"Centered academic layout with classic headings and balanced spacing.", isPremium:false, accent:"#1a1a1a", palette:{bg:"#ffffff",primary:"#1a1a1a",secondary:"#4a4a4a"} },
  { id:"research",  name:"Research",  tag:"Detailed",   category:"Academic",     description:"Publication-style hierarchy tuned for research-heavy resumes.", isPremium:false, accent:"#1f1f1f", palette:{bg:"#ffffff",primary:"#1f1f1f",secondary:"#555555"} },
];