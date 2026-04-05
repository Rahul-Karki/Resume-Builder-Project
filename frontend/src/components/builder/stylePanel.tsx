import React, { useState } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { fontOptions, ResumeStyle } from "@/types/resume-types";

// ─── Sub-components ────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
    {children}
  </div>
);

const Row = ({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) => (
  <div style={{ display: "flex", gap, alignItems: "center" }}>{children}</div>
);

const SectionBlock = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #1E1E1E" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
          color: "#C8C7C0", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        }}
      >
        {title}
        <span style={{ fontSize: 12, color: "#555", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}>▾</span>
      </button>
      {open && <div style={{ padding: "4px 16px 16px" }}>{children}</div>}
    </div>
  );
};

interface ColorSwatchProps {
  value: string;
  field: keyof ResumeStyle;
  onChange: (field: keyof ResumeStyle, value: string) => void;
  label: string;
}

const ColorSwatch = ({ value, field, onChange, label }: ColorSwatchProps) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <div style={{ position: "relative", width: 36, height: 36 }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(field, e.target.value)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
      />
      <div style={{ width: 36, height: 36, borderRadius: 8, background: value, border: "2px solid #2A2A2A", cursor: "pointer" }} />
    </div>
    <span style={{ fontSize: 9, color: "#555", textAlign: "center", lineHeight: 1.2 }}>{label}</span>
  </div>
);

// ─── Preset Color Themes ────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: "Ink",       accent: "#1a1a1a", heading: "#111111", text: "#333333", muted: "#666666", border: "#cccccc", bg: "#ffffff" },
  { label: "Navy",      accent: "#1B2B4B", heading: "#1B2B4B", text: "#333333", muted: "#7A8BA0", border: "#C5D0DE", bg: "#ffffff" },
  { label: "Teal",      accent: "#0F766E", heading: "#0D4F49", text: "#1E3A38", muted: "#5A8A86", border: "#B2DFDB", bg: "#ffffff" },
  { label: "Slate",     accent: "#475569", heading: "#1E293B", text: "#334155", muted: "#64748B", border: "#CBD5E1", bg: "#ffffff" },
  { label: "Burgundy",  accent: "#7C2D3B", heading: "#4A1825", text: "#2D1A1E", muted: "#9C5060", border: "#E8C4CC", bg: "#ffffff" },
  { label: "Forest",    accent: "#14532D", heading: "#052E16", text: "#166534", muted: "#4D7C60", border: "#BBF7D0", bg: "#ffffff" },
  { label: "Gold",      accent: "#92400E", heading: "#451A03", text: "#292524", muted: "#78350F", border: "#FDE68A", bg: "#FFFBEB" },
  { label: "Night",     accent: "#818CF8", heading: "#E2E8F0", text: "#CBD5E1", muted: "#64748B", border: "#334155", bg: "#0F172A" },
];

// ─── Main StylePanel ───────────────────────────────────────────────────────────
export function StylePanel() {
  const { resume, updateStyle, resetStyle } = useResumeBuilderStore();
  const { style } = resume;

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    updateStyle("accentColor", preset.accent);
    updateStyle("headingColor", preset.heading);
    updateStyle("textColor", preset.text);
    updateStyle("mutedColor", preset.muted);
    updateStyle("borderColor", preset.border);
    updateStyle("backgroundColor", preset.bg);
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F0EFE8" }}>Style Customizer</div>
        <button
          onClick={resetStyle}
          style={{ fontSize: 11, color: "#555", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          Reset
        </button>
      </div>

      {/* Color Themes */}
      <SectionBlock title="Color Theme">
        <Label>Quick Presets</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              title={preset.label}
              style={{
                padding: "6px 4px", borderRadius: 8, border: `2px solid ${preset.accent === style.accentColor ? preset.accent : "#2A2A2A"}`,
                background: "#161616", cursor: "pointer", fontFamily: "inherit", fontSize: 10, color: "#888",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <div style={{ display: "flex", gap: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: preset.accent }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: preset.text }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: preset.bg, border: "1px solid #333" }} />
              </div>
              {preset.label}
            </button>
          ))}
        </div>
        <Label>Fine-tune Colors</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <ColorSwatch value={style.accentColor}    field="accentColor"    onChange={updateStyle} label="Accent" />
          <ColorSwatch value={style.headingColor}   field="headingColor"   onChange={updateStyle} label="Heading" />
          <ColorSwatch value={style.textColor}      field="textColor"      onChange={updateStyle} label="Body Text" />
          <ColorSwatch value={style.mutedColor}     field="mutedColor"     onChange={updateStyle} label="Muted" />
          <ColorSwatch value={style.borderColor}    field="borderColor"    onChange={updateStyle} label="Borders" />
          <ColorSwatch value={style.backgroundColor} field="backgroundColor" onChange={updateStyle} label="Page BG" />
        </div>
        {/* Hex inputs for each */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Accent", field: "accentColor" as keyof ResumeStyle, value: style.accentColor },
            { label: "Heading", field: "headingColor" as keyof ResumeStyle, value: style.headingColor },
            { label: "Body", field: "textColor" as keyof ResumeStyle, value: style.textColor },
            { label: "Page BG", field: "backgroundColor" as keyof ResumeStyle, value: style.backgroundColor },
          ].map(({ label, field, value }) => (
            <div key={field}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>{label}</div>
              <input
                type="text"
                value={value as string}
                onChange={e => updateStyle(field, e.target.value)}
                style={{
                  width: "100%", padding: "5px 8px", background: "#161616", border: "1px solid #2A2A2A",
                  borderRadius: 6, color: "#C8C7C0", fontSize: 11, fontFamily: "monospace",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* Typography */}
      <SectionBlock title="Typography">
        <div style={{ marginBottom: 12 }}>
          <Label>Body Font</Label>
          <select
            value={style.bodyFont}
            onChange={e => updateStyle("bodyFont", e.target.value)}
            style={selectStyle}
          >
            {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          {/* Live preview */}
          <div style={{ marginTop: 6, padding: "8px 10px", background: "#161616", borderRadius: 6, fontSize: 12, fontFamily: style.bodyFont, color: "#888", lineHeight: 1.4 }}>
            The quick brown fox jumps over the lazy dog.
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Heading Font</Label>
          <select
            value={style.headingFont}
            onChange={e => updateStyle("headingFont", e.target.value)}
            style={selectStyle}
          >
            {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <div style={{ marginTop: 6, padding: "8px 10px", background: "#161616", borderRadius: 6, fontSize: 14, fontFamily: style.headingFont, color: "#F0EFE8", fontWeight: 700 }}>
            Alexandra Chen
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Font Size</Label>
          <Row>
            {(["9pt", "9.5pt", "10pt", "10.5pt", "11pt", "11.5pt"] as const).map(sz => (
              <button
                key={sz}
                onClick={() => updateStyle("fontSize", sz)}
                style={{
                  flex: 1, padding: "5px 4px", borderRadius: 6, border: "1px solid",
                  borderColor: style.fontSize === sz ? "#C8F55A" : "#2A2A2A",
                  background: style.fontSize === sz ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.fontSize === sz ? "#C8F55A" : "#555",
                  fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {sz}
              </button>
            ))}
          </Row>
        </div>
        <div>
          <Label>Line Height</Label>
          <Row>
            {(["1.3", "1.4", "1.5", "1.6", "1.7"] as const).map(lh => (
              <button
                key={lh}
                onClick={() => updateStyle("lineHeight", lh)}
                style={{
                  flex: 1, padding: "5px 4px", borderRadius: 6, border: "1px solid",
                  borderColor: style.lineHeight === lh ? "#C8F55A" : "#2A2A2A",
                  background: style.lineHeight === lh ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.lineHeight === lh ? "#C8F55A" : "#555",
                  fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {lh}
              </button>
            ))}
          </Row>
        </div>
      </SectionBlock>

      {/* Layout & Spacing */}
      <SectionBlock title="Layout & Spacing">
        <div style={{ marginBottom: 12 }}>
          <Label>Page Margins</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(["tight", "normal", "relaxed", "spacious"] as const).map(m => (
              <button
                key={m}
                onClick={() => updateStyle("pageMargin", m)}
                style={{
                  padding: "7px", borderRadius: 7, border: "1px solid",
                  borderColor: style.pageMargin === m ? "#C8F55A" : "#2A2A2A",
                  background: style.pageMargin === m ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.pageMargin === m ? "#C8F55A" : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Section Spacing</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {(["compact", "normal", "loose"] as const).map(sp => (
              <button
                key={sp}
                onClick={() => updateStyle("sectionSpacing", sp)}
                style={{
                  padding: "7px", borderRadius: 7, border: "1px solid",
                  borderColor: style.sectionSpacing === sp ? "#C8F55A" : "#2A2A2A",
                  background: style.sectionSpacing === sp ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.sectionSpacing === sp ? "#C8F55A" : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Header Alignment</Label>
          <Row>
            {(["left", "center"] as const).map(align => (
              <button
                key={align}
                onClick={() => updateStyle("headerAlign", align)}
                style={{
                  flex: 1, padding: "7px", borderRadius: 7, border: "1px solid",
                  borderColor: style.headerAlign === align ? "#C8F55A" : "#2A2A2A",
                  background: style.headerAlign === align ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.headerAlign === align ? "#C8F55A" : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize",
                }}
              >
                {align === "left" ? "⬜ Left" : "☰ Center"}
              </button>
            ))}
          </Row>
        </div>
      </SectionBlock>

      {/* Decorative */}
      <SectionBlock title="Details & Decoration">
        <div style={{ marginBottom: 12 }}>
          <Row>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#C8C7C0", fontWeight: 500 }}>Section Dividers</div>
              <div style={{ fontSize: 11, color: "#555" }}>Horizontal lines between sections</div>
            </div>
            <ToggleSwitch
              checked={style.showDividers}
              onChange={v => updateStyle("showDividers", v)}
            />
          </Row>
        </div>
        <div>
          <Label>Bullet Style</Label>
          <Row gap={6}>
            {(["•", "–", "›", "▸", "◦"] as const).map(b => (
              <button
                key={b}
                onClick={() => updateStyle("bulletStyle", b)}
                style={{
                  width: 36, height: 36, borderRadius: 7, border: "1px solid",
                  borderColor: style.bulletStyle === b ? "#C8F55A" : "#2A2A2A",
                  background: style.bulletStyle === b ? "rgba(200,245,90,0.1)" : "#161616",
                  color: style.bulletStyle === b ? "#C8F55A" : "#888",
                  fontSize: 16, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {b}
              </button>
            ))}
          </Row>
        </div>
      </SectionBlock>

      {/* Bottom padding */}
      <div style={{ height: 40 }} />
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: checked ? "#C8F55A" : "#2A2A2A", position: "relative", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: checked ? "#0E0E0E" : "#555", transition: "left 0.2s",
      }} />
    </div>
  );
}

// ─── Shared select style ───────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "#161616", border: "1px solid #2A2A2A",
  borderRadius: 7, color: "#C8C7C0", fontSize: 12, fontFamily: "'Outfit', sans-serif",
  outline: "none", cursor: "pointer",
};