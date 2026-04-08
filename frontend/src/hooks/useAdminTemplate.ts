import { useState, useEffect, useCallback } from "react";
import { AdminTemplate, TemplateFormData, TemplateStatus } from "../types/admin.types";

// ─── API base ─────────────────────────────────────────────────────────────────
// Replace with your real token source (context, localStorage, etc.)

const API = "/api/admin";
const getToken = () => localStorage.getItem("adminToken") ?? "";
const headers  = () => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${getToken()}`,
});

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res  = await fetch(`${API}${path}`, { ...options, headers: headers() });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

// ─── Mock data for development ─────────────────────────────────────────────────

const MOCK_TEMPLATES: AdminTemplate[] = [
  {
    _id:"t1", layoutId:"classic", name:"Classic", description:"Timeless serif layout.", category:"professional",
    tag:"Timeless", thumbnailUrl:"", status:"published", isPremium:false, sortOrder:1,
    cssVars:{accentColor:"#1a1a1a",headingColor:"#111",textColor:"#333",mutedColor:"#666",borderColor:"#ccc",backgroundColor:"#fff",bodyFont:"EB Garamond, serif",headingFont:"EB Garamond, serif",fontSize:"10.5pt",lineHeight:"1.5"},
    slots:{summary:true,experience:true,education:true,skills:true,projects:true,certifications:true,languages:false},
    createdAt:"2024-01-10T00:00:00Z", updatedAt:"2024-03-01T00:00:00Z", publishedAt:"2024-01-12T00:00:00Z",
  },
  {
    _id:"t2", layoutId:"executive", name:"Executive", description:"Navy header bar for leadership.", category:"corporate",
    tag:"Corporate", thumbnailUrl:"", status:"published", isPremium:false, sortOrder:2,
    cssVars:{accentColor:"#1B2B4B",headingColor:"#1B2B4B",textColor:"#333",mutedColor:"#7A8BA0",borderColor:"#C5D0DE",backgroundColor:"#fff",bodyFont:"Lato, sans-serif",headingFont:"Playfair Display, serif",fontSize:"10.5pt",lineHeight:"1.5"},
    slots:{summary:true,experience:true,education:true,skills:true,projects:true,certifications:true,languages:false},
    createdAt:"2024-01-12T00:00:00Z", updatedAt:"2024-03-05T00:00:00Z", publishedAt:"2024-01-14T00:00:00Z",
  },
  {
    _id:"t3", layoutId:"modern", name:"Modern", description:"Teal accent rule for tech roles.", category:"technical",
    tag:"Tech-Ready", thumbnailUrl:"", status:"published", isPremium:false, sortOrder:3,
    cssVars:{accentColor:"#0F766E",headingColor:"#0D4F49",textColor:"#1E3A38",mutedColor:"#5A8A86",borderColor:"#B2DFDB",backgroundColor:"#fff",bodyFont:"DM Sans, sans-serif",headingFont:"DM Sans, sans-serif",fontSize:"10.5pt",lineHeight:"1.5"},
    slots:{summary:true,experience:true,education:true,skills:true,projects:true,certifications:true,languages:true},
    createdAt:"2024-01-15T00:00:00Z", updatedAt:"2024-03-08T00:00:00Z", publishedAt:"2024-01-16T00:00:00Z",
  },
  {
    _id:"t4", layoutId:"compact", name:"Compact", description:"Dense label-column layout.", category:"professional",
    tag:"One-Page", thumbnailUrl:"", status:"published", isPremium:true, sortOrder:4,
    cssVars:{accentColor:"#111",headingColor:"#111",textColor:"#333",mutedColor:"#666",borderColor:"#ddd",backgroundColor:"#fff",bodyFont:"IBM Plex Sans, sans-serif",headingFont:"IBM Plex Sans, sans-serif",fontSize:"9.5pt",lineHeight:"1.45"},
    slots:{summary:true,experience:true,education:true,skills:true,projects:true,certifications:true,languages:false},
    createdAt:"2024-02-01T00:00:00Z", updatedAt:"2024-03-10T00:00:00Z", publishedAt:"2024-02-03T00:00:00Z",
  },
  {
    _id:"t5", layoutId:"sidebar", name:"Sidebar", description:"Dark sidebar, two-column layout.", category:"creative",
    tag:"Structured", thumbnailUrl:"", status:"published", isPremium:true, sortOrder:5,
    cssVars:{accentColor:"#1E293B",headingColor:"#1E293B",textColor:"#334155",mutedColor:"#64748B",borderColor:"#CBD5E1",backgroundColor:"#fff",bodyFont:"Nunito Sans, sans-serif",headingFont:"Nunito, sans-serif",fontSize:"10pt",lineHeight:"1.5"},
    slots:{summary:true,experience:true,education:true,skills:true,projects:true,certifications:true,languages:true},
    createdAt:"2024-02-10T00:00:00Z", updatedAt:"2024-03-12T00:00:00Z", publishedAt:"2024-02-12T00:00:00Z",
  },
  {
    _id:"t6", layoutId:"minimal", name:"Minimal", description:"Ultra-clean whitespace-first design.", category:"academic",
    tag:"Simple", thumbnailUrl:"", status:"draft", isPremium:false, sortOrder:6,
    cssVars:{accentColor:"#555",headingColor:"#333",textColor:"#444",mutedColor:"#888",borderColor:"#ddd",backgroundColor:"#fff",bodyFont:"Source Serif 4, serif",headingFont:"Source Serif 4, serif",fontSize:"10.5pt",lineHeight:"1.6"},
    slots:{summary:true,experience:true,education:true,skills:false,projects:false,certifications:false,languages:false},
    createdAt:"2024-03-05T00:00:00Z", updatedAt:"2024-03-14T00:00:00Z", publishedAt:null,
  },
];

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAdminTemplates() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving,    setSaving]    = useState(false);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Fetch all ─────────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // const data = await apiFetch<AdminTemplate[]>("/templates");
      await new Promise(r => setTimeout(r, 700));
      setTemplates(MOCK_TEMPLATES);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Create ────────────────────────────────────────────────────────────────
  const createTemplate = useCallback(async (form: TemplateFormData): Promise<boolean> => {
    setSaving(true);
    try {
      // const created = await apiFetch<AdminTemplate>("/templates", { method:"POST", body:JSON.stringify(form) });
      await new Promise(r => setTimeout(r, 600));
      const newTpl: AdminTemplate = {
        ...form, _id: "t" + Date.now(), status: "draft", thumbnailUrl: "",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: null,
      };
      setTemplates(prev => [...prev, newTpl]);
      showToast(`"${form.name}" created as draft`);
      return true;
    } catch (e: any) {
      showToast(e.message, "error"); return false;
    } finally { setSaving(false); }
  }, [showToast]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTemplate = useCallback(async (id: string, form: TemplateFormData): Promise<boolean> => {
    setSaving(true);
    try {
      // await apiFetch<AdminTemplate>(`/templates/${id}`, { method:"PUT", body:JSON.stringify(form) });
      await new Promise(r => setTimeout(r, 500));
      setTemplates(prev => prev.map(t => t._id === id ? { ...t, ...form, updatedAt: new Date().toISOString() } : t));
      showToast(`"${form.name}" updated`);
      return true;
    } catch (e: any) {
      showToast(e.message, "error"); return false;
    } finally { setSaving(false); }
  }, [showToast]);

  // ── Set status ────────────────────────────────────────────────────────────
  const setStatus = useCallback(async (id: string, status: TemplateStatus) => {
    try {
      // await apiFetch(`/templates/${id}/status`, { method:"PATCH", body:JSON.stringify({ status }) });
      await new Promise(r => setTimeout(r, 300));
      setTemplates(prev => prev.map(t =>
        t._id === id ? { ...t, status, publishedAt: status === "published" ? new Date().toISOString() : t.publishedAt } : t
      ));
      const label = status === "published" ? "published" : status === "archived" ? "archived" : "set to draft";
      showToast(`Template ${label}`);
    } catch (e: any) { showToast(e.message, "error"); }
  }, [showToast]);

  // ── Toggle premium ────────────────────────────────────────────────────────
  const togglePremium = useCallback(async (id: string) => {
    try {
      await new Promise(r => setTimeout(r, 300));
      setTemplates(prev => prev.map(t => t._id === id ? { ...t, isPremium: !t.isPremium } : t));
      const tpl = templates.find(t => t._id === id);
      showToast(`"${tpl?.name}" is now ${tpl?.isPremium ? "free" : "premium"}`);
    } catch (e: any) { showToast(e.message, "error"); }
  }, [templates, showToast]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      await new Promise(r => setTimeout(r, 400));
      const tpl = templates.find(t => t._id === id);
      setTemplates(prev => prev.filter(t => t._id !== id));
      showToast(`"${tpl?.name}" deleted`);
      return true;
    } catch (e: any) { showToast(e.message, "error"); return false; }
  }, [templates, showToast]);

  return {
    templates, loading, error, toast, saving,
    fetchTemplates, createTemplate, updateTemplate,
    setStatus, togglePremium, deleteTemplate,
  };
}