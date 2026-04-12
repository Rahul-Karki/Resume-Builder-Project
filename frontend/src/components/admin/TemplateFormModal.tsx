import { useState, useEffect } from "react";
import {
  AdminTemplate, TemplateFormData, DEFAULT_FORM, DEFAULT_CSS_VARS,
  CATEGORY_OPTIONS, FONT_OPTIONS, REGISTERED_LAYOUT_IDS, CssVars, Slots,
} from "../../types/admin.types";

interface Props {
  mode:     "create" | "edit";
  initial?: AdminTemplate;
  onSave:   (form: TemplateFormData) => Promise<boolean>;
  onClose:  () => void;
  saving:   boolean;
}

// ─── Shared field styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 11px",
  background: "#141414", border: "1px solid #252525", borderRadius: 7,
  color: "#C8C7C0", fontSize: 13, fontFamily: "'Outfit', sans-serif",
  outline: "none", boxSizing: "border-box",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700, color: "#444",
  textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5,
  fontFamily: "'Outfit', sans-serif",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><span style={lbl}>{label}</span>{children}</div>;
}

// ─── Section accordion ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: "1px solid #1A1A1A" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 20px", background: "none", border: "none", cursor: "pointer",
        color: "#C8C7C0", fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
      }}>
        {title}
        <span style={{ fontSize: 11, color: "#333", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
      </button>
      {open && <div style={{ padding: "4px 20px 18px" }}>{children}</div>}
    </div>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function ColorField({ label, field, value, onChange }: {
  label: string; field: keyof CssVars; value: string;
  onChange: (f: keyof CssVars, v: string) => void;
}) {
  return (
    <div>
      <span style={{ ...lbl, marginBottom: 4 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ position: "relative", width: 32, height: 32 }}>
          <input type="color" value={value} onChange={e => onChange(field, e.target.value)}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
          <div style={{ width: 32, height: 32, borderRadius: 7, background: value, border: "1px solid #2A2A2A" }} />
        </div>
        <input type="text" value={value} onChange={e => onChange(field, e.target.value)}
          style={{ ...inp, flex: 1, fontFamily: "monospace", fontSize: 12 }} />
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 42, height: 22, borderRadius: 11, cursor: "pointer",
      background: checked ? "#C8F55A" : "#1E1E1E", position: "relative", transition: "background 0.2s",
    }}>
      <div style={{
        position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
        background: checked ? "#0E0E0E" : "#3A3A3A",
        left: checked ? 23 : 3, transition: "left 0.2s",
      }} />
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function TemplateFormModal({ mode, initial, onSave, onClose, saving }: Props) {
  const [form, setForm] = useState<TemplateFormData>(
    initial
      ? { layoutId:initial.layoutId, name:initial.name, description:initial.description,
          category:initial.category, tag:initial.tag, isPremium:initial.isPremium,
          sortOrder:initial.sortOrder, cssVars:{...initial.cssVars}, slots:{...initial.slots} }
      : { ...DEFAULT_FORM }
  );
  const [tab, setTab] = useState<"general" | "style" | "slots">("general");

  const set = <K extends keyof TemplateFormData>(k: K, v: TemplateFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));
  const setCss = (k: keyof CssVars, v: string) =>
    setForm(f => ({ ...f, cssVars: { ...f.cssVars, [k]: v } }));
  const setSlot = (k: keyof Slots, v: boolean) =>
    setForm(f => ({ ...f, slots: { ...f.slots, [k]: v } }));

  const handleSubmit = async () => {
    if (!form.layoutId || !form.name) return;
    const ok = await onSave(form);
    if (ok) onClose();
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div style={{
        background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: 16,
        width: 580, maxHeight: "90vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 0", borderBottom: "1px solid #1A1A1A" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EFE8" }}>
                {mode === "create" ? "Create Template" : `Edit — ${initial?.name}`}
              </div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                {mode === "create" ? "Add a new layout to the system" : "Update template configuration"}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {(["general", "style", "slots"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                color: tab === t ? "#F0EFE8" : "#444",
                borderBottom: `2px solid ${tab === t ? "#C8F55A" : "transparent"}`,
                textTransform: "capitalize",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* ── General Tab ── */}
          {tab === "general" && (
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Layout ID *">
                  <select value={form.layoutId} onChange={e => set("layoutId", e.target.value)} style={{ ...inp, cursor: "pointer" }} disabled={mode === "edit"}>
                    <option value="">— select —</option>
                    {REGISTERED_LAYOUT_IDS.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: "#333", marginTop: 3 }}>Maps to a React component in your codebase.</div>
                </Field>
                <Field label="Display Name *">
                  <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Executive Pro" style={inp} />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={3} placeholder="Short description shown in the template picker…"
                  style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Category">
                  <select value={form.category} onChange={e => set("category", e.target.value as any)} style={{ ...inp, cursor: "pointer" }}>
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Tag">
                  <input value={form.tag} onChange={e => set("tag", e.target.value)} placeholder="e.g. Tech-Ready" style={inp} />
                </Field>
                <Field label="Sort Order">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.sortOrder}
                    onChange={e => set("sortOrder", Number(e.target.value))}
                    style={inp}
                  />
                  <div style={{ fontSize: 10, color: "#333", marginTop: 3 }}>Lower number shows earlier in the list.</div>
                </Field>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle checked={form.isPremium} onChange={v => set("isPremium", v)} />
                <div>
                  <div style={{ fontSize: 13, color: "#C8C7C0", fontWeight: 500 }}>Premium Template</div>
                  <div style={{ fontSize: 11, color: "#444" }}>Only visible to paid users</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Style Tab ── */}
          {tab === "style" && (
            <div>
              <Section title="Colors">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {([
                    ["Accent",     "accentColor"],
                    ["Heading",    "headingColor"],
                    ["Body Text",  "textColor"],
                    ["Muted",      "mutedColor"],
                    ["Border",     "borderColor"],
                    ["Page BG",    "backgroundColor"],
                  ] as [string, keyof CssVars][]).map(([label, field]) => (
                    <ColorField key={field} label={label} field={field} value={form.cssVars[field]} onChange={setCss} />
                  ))}
                </div>
                {/* Live preview swatch */}
                <div style={{ marginTop: 14, padding: "12px 14px", background: form.cssVars.backgroundColor, borderRadius: 8, border: "1px solid #2A2A2A" }}>
                  <div style={{ fontFamily: form.cssVars.headingFont, fontSize: 15, fontWeight: 700, color: form.cssVars.accentColor, marginBottom: 4 }}>
                    Your Heading
                  </div>
                  <div style={{ fontFamily: form.cssVars.bodyFont, fontSize: 12, color: form.cssVars.textColor, lineHeight: 1.5 }}>
                    Body text rendered at {form.cssVars.fontSize} with {form.cssVars.lineHeight} line height.
                    <span style={{ color: form.cssVars.mutedColor }}> Muted text for secondary info.</span>
                  </div>
                </div>
              </Section>

              <Section title="Typography">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Body Font">
                    <select value={form.cssVars.bodyFont} onChange={e => setCss("bodyFont", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
                    </select>
                  </Field>
                  <Field label="Heading Font">
                    <select value={form.cssVars.headingFont} onChange={e => setCss("headingFont", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split(",")[0]}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Font Size">
                    <select value={form.cssVars.fontSize} onChange={e => setCss("fontSize", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {["9pt","9.5pt","10pt","10.5pt","11pt","11.5pt"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Line Height">
                    <select value={form.cssVars.lineHeight} onChange={e => setCss("lineHeight", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {["1.3","1.4","1.5","1.6","1.7"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {/* ── Slots Tab ── */}
          {tab === "slots" && (
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 14, lineHeight: 1.5 }}>
                Control which resume sections this template supports. Hidden sections won't appear in the form editor when this template is active.
              </div>
              {(Object.keys(form.slots) as (keyof Slots)[]).map(key => (
                <div key={key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 0", borderBottom: "1px solid #141414",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#C8C7C0", textTransform: "capitalize" }}>{key}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>
                      {{
                        summary: "Professional summary paragraph",
                        experience: "Work history entries",
                        education: "Degrees & institutions",
                        skills: "Skill categories with items",
                        projects: "Personal / open-source projects",
                        certifications: "Professional certifications",
                        languages: "Spoken languages & proficiency",
                      }[key]}
                    </div>
                  </div>
                  <Toggle checked={form.slots[key]} onChange={v => setSlot(key, v)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid #1A1A1A", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid #252525",
            background: "transparent", color: "#666", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.layoutId || !form.name}
            style={{
              padding: "8px 22px", borderRadius: 8, border: "none",
              background: saving ? "#888" : "#C8F55A", color: "#0E0E0E",
              fontSize: 13, fontWeight: 800, cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit", opacity: (!form.layoutId || !form.name) ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : mode === "create" ? "Create Template" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}