import { useState, useEffect, useCallback } from "react";
import { AdminTemplate, TemplateFormData, TemplateStatus } from "../types/admin.types";
import { api } from "@/services/api";
import type { AxiosError } from "axios";

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const getErrorMessage = (error: unknown) => {
  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return (
    axiosError.response?.data?.error ??
    axiosError.response?.data?.message ??
    axiosError.message ??
    "Request failed"
  );
};

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
      const res = await api.get<ApiEnvelope<AdminTemplate[]>>("/admin/templates");
      setTemplates(res.data.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Create ────────────────────────────────────────────────────────────────
  const createTemplate = useCallback(async (form: TemplateFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.post<ApiEnvelope<AdminTemplate>>("/admin/templates", form);
      const created = res.data.data;
      setTemplates(prev => [created, ...prev]);
      showToast(`"${form.name}" created as draft`);
      return true;
    } catch (e) {
      showToast(getErrorMessage(e), "error"); return false;
    } finally { setSaving(false); }
  }, [showToast]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTemplate = useCallback(async (id: string, form: TemplateFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await api.put<ApiEnvelope<AdminTemplate>>(`/admin/templates/${id}`, form);
      const updated = res.data.data;
      setTemplates(prev => prev.map(t => t._id === id ? updated : t));
      showToast(`"${form.name}" updated`);
      return true;
    } catch (e) {
      showToast(getErrorMessage(e), "error"); return false;
    } finally { setSaving(false); }
  }, [showToast]);

  // ── Set status ────────────────────────────────────────────────────────────
  const setStatus = useCallback(async (id: string, status: TemplateStatus) => {
    try {
      const res = await api.patch<ApiEnvelope<AdminTemplate>>(`/admin/templates/${id}/status`, { status });
      const updated = res.data.data;
      setTemplates(prev => prev.map(t => (t._id === id ? updated : t)));
      const label = status === "published" ? "published" : status === "archived" ? "archived" : "set to draft";
      showToast(`Template ${label}`);
    } catch (e) { showToast(getErrorMessage(e), "error"); }
  }, [showToast]);

  // ── Toggle premium ────────────────────────────────────────────────────────
  const togglePremium = useCallback(async (id: string) => {
    try {
      const res = await api.patch<ApiEnvelope<AdminTemplate>>(`/admin/templates/${id}/premium`);
      const updated = res.data.data;
      setTemplates(prev => prev.map(t => (t._id === id ? updated : t)));
      showToast(`"${updated.name}" is now ${updated.isPremium ? "premium" : "free"}`);
    } catch (e) { showToast(getErrorMessage(e), "error"); }
  }, [showToast]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/admin/templates/${id}`);
      const tpl = templates.find(t => t._id === id);
      setTemplates(prev => prev.filter(t => t._id !== id));
      showToast(`"${tpl?.name}" deleted`);
      return true;
    } catch (e) { showToast(getErrorMessage(e), "error"); return false; }
  }, [templates, showToast]);

  return {
    templates, loading, error, toast, saving,
    fetchTemplates, createTemplate, updateTemplate,
    setStatus, togglePremium, deleteTemplate,
  };
}