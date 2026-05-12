# Puppeteer PDF Rendering - Styling & Font Fix Guide

## Overview

Your resume builder uses Puppeteer to render React templates to PDF. This requires careful handling of:
- Tailwind CSS compilation
- Web fonts
- Print backgrounds
- Media queries
- CSS specificity

This guide fixes common issues where styles disappear or fonts fail to load.

---

## 1. Tailwind CSS Rendering Issues

### Problem: Tailwind Utilities Don't Apply in PDF

**Symptoms:**
- Colors are missing
- Spacing is wrong
- Layout breaks
- Buttons/text styling disappears

**Root Cause:**
- Puppeteer loads frontend from dev server or compiled build
- Dev server (Vite) compiles Tailwind on-demand based on used selectors
- If Tailwind config doesn't include preview page HTML, utilities don't compile

**Solution A: Ensure Tailwind Includes Preview Route**

**File: `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'
import defaultConfig from 'tailwindcss/defaultConfig'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // CRITICAL: Include the preview route so Tailwind finds utility usage
    "./src/pages/ResumePreviewPage.tsx",
    "./src/templates/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

**Solution B: Use Dynamic Class Names (If Needed)**

If users can input arbitrary colors/values, use CSS variables:

```tsx
// ResumeRenderer.tsx
export function ResumeRenderer({ resume, forExport = false }: Props) {
  return (
    <div
      style={{
        // Use inline styles for dynamic values
        backgroundColor: resume.style.backgroundColor,
        color: resume.style.textColor,
        fontFamily: resume.style.fontFamily,
      }}
      className="p-8 min-h-full"
    >
      {/* Content */}
    </div>
  );
}
```

---

## 2. Web Fonts Not Loading

### Problem: Fonts Are Missing, Text Looks Wrong

**Symptoms:**
- System fonts appear instead of custom fonts
- Text is too large/small
- Font weight is wrong
- PDF looks completely different from preview

**Root Cause:**
- Puppeteer needs time to download fonts from CDN
- CSS `@import` for Google Fonts takes time
- Puppeteer might not wait long enough

**Solution: Proper Font Loading Strategy**

**File: `frontend/src/index.css`**

```css
/* Load fonts at top of CSS so they're downloaded early */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

/* Ensure fonts are applied globally */
html, body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Monospace fonts */
code, pre, .monospace {
  font-family: 'Space Mono', 'JetBrains Mono', monospace;
}
```

**File: `frontend/src/pages/ResumePreviewPage.tsx`**

```typescript
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/services/api";
import { ResumeDocument } from "@/types/resume-types";
import ResumeRenderer from "@/templates/ResumeRenderer";

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Signal fonts are ready to Puppeteer
    const checkFonts = async () => {
      try {
        // Wait for all fonts to load
        if (document.fonts && typeof document.fonts.ready !== 'undefined') {
          await document.fonts.ready;
        }
        if (mounted) setFontsReady(true);
      } catch (err) {
        // Fonts might fail, but continue rendering
        if (mounted) setFontsReady(true);
      }
    };

    checkFonts();

    const load = async () => {
      if (!id) return setError("Missing preview id");
      try {
        const params = new URLSearchParams(window.location.search);
        const previewToken = params.get("previewToken");
        
        const url = previewToken
          ? `/resumes/preview-data/${encodeURIComponent(id)}?previewToken=${encodeURIComponent(previewToken)}`
          : `/resumes/preview-data/${encodeURIComponent(id)}`;
        
        const res = await api.get(url);
        if (!mounted) return;
        setResume(res.data?.resume ?? null);
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.message || "Failed to load preview");
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#f55", fontFamily: "sans-serif" }}>
        Preview error: {error}
      </div>
    );
  }

  if (!resume) {
    return (
      <div style={{ padding: 24, color: "#ccc", fontFamily: "sans-serif" }}>
        Loading preview…
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: resume.style?.backgroundColor ?? "#fff",
        padding: 0,
        margin: 0,
        fontFamily: "inherit",
      }}
    >
      {/* CRITICAL: This element is waited on by Puppeteer */}
      <div
        id="resume-export-root"
        style={{
          width: "794px", // A4 width at 96dpi
          margin: "0 auto",
          boxSizing: "border-box",
          minHeight: "100vh",
        }}
      >
        <ResumeRenderer resume={resume} forExport={true} />
      </div>

      {/* Signal completion to Puppeteer */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__RESUME_PREVIEW_READY = true;
            window.__FONTS_READY = ${fontsReady};
          `,
        }}
      />
    </div>
  );
}
```

---

## 3. Backgrounds Missing from PDF

### Problem: Background Colors/Gradients Don't Appear in PDF

**Symptoms:**
- White text on white background (invisible)
- Colored sections are white
- Gradients become solid
- Print version looks wrong

**Root Cause:**
- Puppeteer defaults to transparent background
- CSS `printBackground: true` must be set in page.pdf()
- Inline styles must be used for dynamic colors

**Solution: Ensure Styles Render with Backgrounds**

**File: `worker/src/processors/resume.processor.ts`** (Already correct, verify):

```typescript
const generatedBuffer = await page.pdf({
  format: "A4",
  printBackground: true, // ✅ CRITICAL - includes backgrounds
  preferCSSPageSize: true,
});
```

**File: `frontend/src/templates/ResumeRenderer.tsx`**

```tsx
import React from "react";
import { ResumeDocument } from "@/types/resume-types";

interface Props {
  resume: ResumeDocument;
  forExport?: boolean;
}

export function ResumeRenderer({ resume, forExport = false }: Props) {
  // Use inline styles for dynamic backgrounds so they're preserved in PDF
  const sectionStyle = {
    backgroundColor: resume.style.backgroundColor,
    color: resume.style.textColor,
  };

  return (
    <div
      style={{
        ...sectionStyle,
        width: "100%",
        minHeight: "1123px", // A4 height at 96dpi
        padding: "40px",
        boxSizing: "border-box",
        fontSize: resume.style.fontSize ?? "11px",
        lineHeight: "1.5",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "20px",
          paddingBottom: "10px",
          borderBottom: `2px solid ${resume.style.accentColor ?? "#333"}`,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
          {resume.personalInfo.fullName}
        </h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
          {resume.personalInfo.email} • {resume.personalInfo.phone}
        </p>
      </div>

      {/* Sections */}
      {/* Each section with proper background */}
      {resume.sectionVisibility.experience && resume.experience.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              color: resume.style.accentColor,
            }}
          >
            EXPERIENCE
          </h2>
          {resume.experience.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{exp.title}</strong>
                <span style={{ fontSize: "11px", color: "#666" }}>{exp.startDate}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#888" }}>{exp.company}</div>
              <p style={{ margin: "4px 0 0 0", fontSize: "11px" }}>{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* More sections... */}
    </div>
  );
}
```

---

## 4. Media Query Issues

### Problem: Print Styles Hide Content, or Screen Styles Don't Apply in PDF

**Symptoms:**
- Sections disappear in PDF but show in preview
- Styling looks different
- Elements marked `print:hidden` don't appear

**Root Cause:**
- Puppeteer uses screen media, not print
- CSS `@media print` won't apply
- `print:hidden` Tailwind class hides content

**Solution: Remove Print-Specific Classes**

**WRONG:**

```tsx
// ❌ This hides the section when Puppeteer renders
<div className="hidden print:block">Screen only preview</div>
<div className="print:hidden">Hides in PDF</div>
```

**CORRECT:**

```tsx
// ✅ Works for both screen and PDF
<div className="flex flex-col gap-4">
  {/* Content always visible */}
</div>

// ✅ If you need different styles for print, use inline styles
<div
  style={{
    display: forExport ? "none" : "block",
    // or just always display
  }}
>
  {/* Content */}
</div>
```

**Audit your templates:**

```bash
# Search for print: classes
grep -r "print:" frontend/src/templates/
grep -r "print:" frontend/src/components/

# Remove or replace:
# - print:hidden → remove the class entirely
# - print:block → set to always block
# - @media print → ensure screen version looks good
```

---

## 5. Media Emulation in Puppeteer (Already Correct)

**File: `worker/src/processors/resume.processor.ts`**

```typescript
// CRITICAL: Use "screen" not "print"
// This ensures all screen-based Tailwind utilities apply
await page.emulateMediaType("screen");
```

This is already correct in your code. The key is:
- `screen` media = full Tailwind access + CSS loads properly
- `print` media = limited utilities, might have print-only CSS

---

## 6. Font Loading in Puppeteer (Already Correct)

**File: `worker/src/processors/resume.processor.ts`**

```typescript
// Wait for fonts to download and render
try {
  await page.evaluateHandle("document.fonts.ready");
} catch (err) {
  logger.debug({ jobId, err }, "Fonts timeout, continuing");
}

// Extra pause for any late CSS
await new Promise((r) => setTimeout(r, 200));
```

This is already correct. The process:
1. Wait for page to load (`waitUntil: "networkidle0"`)
2. Wait for fonts (`document.fonts.ready`)
3. Wait 200ms more for CSS to settle
4. Generate PDF

---

## 7. CSS Specificity & Tailwind Conflicts

### Problem: Tailwind Classes Override Custom CSS (or vice versa)

**Solution: Proper CSS Organization**

**File: `frontend/src/index.css`**

```css
/* Order matters: specificity increases */

/* 1. Fonts and variables */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

/* 2. Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 3. Base styles */
body {
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 4. Tailwind (auto-imported) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 5. Custom styles (override Tailwind) */
.resume-section {
  margin-bottom: 1.5rem;
  page-break-inside: avoid;
}

.resume-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## 8. Testing PDF Rendering

### Test 1: Check Fonts Load

```bash
# In worker logs, look for:
# "document.fonts.ready timed out or failed, continuing"
# If this appears, fonts might not load properly
```

### Test 2: Verify Colors in PDF

Generate a test resume with:
- Colored text
- Colored backgrounds
- Gradients (if using them)
- Check PDF output

### Test 3: Verify Spacing

Measure spacing in PDF:
- Should match preview
- No weird gaps
- No overlapping text

### Test 4: Font Rendering

Check that fonts are:
- Correct typeface
- Correct weight
- Correct size
- Readable

---

## 9. Production Checklist

Before deploying:

- [ ] Tailwind config includes all template files
- [ ] `@import` statements for fonts in index.css
- [ ] No `print:hidden` or `@media print` hiding content
- [ ] `printBackground: true` in page.pdf()
- [ ] `emulateMediaType("screen")` in Puppeteer
- [ ] `document.fonts.ready` wait implemented
- [ ] 200ms pause after fonts
- [ ] Dynamic colors use inline styles
- [ ] Backgrounds use solid colors (test gradients separately)
- [ ] All fonts are web-safe or imported from CDN

---

## 10. Troubleshooting Checklist

**If styles disappear:**
1. Check Tailwind config includes preview route
2. Verify @import statements for fonts
3. Look for `print:hidden` classes
4. Test with static colors instead of dynamic

**If fonts don't load:**
1. Verify @import in index.css
2. Check document.fonts.ready wait
3. Look for CORS issues
4. Try system fonts as fallback

**If backgrounds missing:**
1. Verify `printBackground: true`
2. Use inline styles for colors
3. Check for CSS hiding backgrounds
4. Test solid colors before gradients

**If PDF looks different from preview:**
1. Check screen vs. print media
2. Verify no display: none in CSS
3. Test viewport size (1280x1800)
4. Check font weight/size

---

## Example: Complete Styled Resume

**File: `frontend/src/templates/ClassicResume.tsx`**

```tsx
import React from "react";
import { ResumeDocument } from "@/types/resume-types";

interface Props {
  resume: ResumeDocument;
  forExport?: boolean;
}

export function ClassicResume({ resume, forExport = false }: Props) {
  const bgColor = resume.style?.backgroundColor ?? "#ffffff";
  const textColor = resume.style?.textColor ?? "#000000";
  const accentColor = resume.style?.accentColor ?? "#0066cc";
  const fontSize = resume.style?.fontSize ?? "11px";
  const fontFamily = resume.style?.fontFamily ?? "'Inter', sans-serif";

  return (
    <div
      style={{
        // Use inline styles for all dynamic properties
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: fontFamily,
        fontSize: fontSize,
        lineHeight: "1.5",
        width: "100%",
        minHeight: "100vh",
        padding: "40px",
        boxSizing: "border-box",
      }}
    >
      {/* Header - always visible */}
      <div style={{ marginBottom: "20px" }} className="page-break-inside-avoid">
        <h1
          style={{
            fontSize: "1.5em",
            fontWeight: "700",
            margin: "0 0 4px 0",
          }}
        >
          {resume.personalInfo.fullName}
        </h1>
        <p
          style={{
            margin: "0",
            fontSize: "0.9em",
            color: accentColor,
          }}
        >
          {resume.personalInfo.email} • {resume.personalInfo.phone}
        </p>
      </div>

      {/* Experience */}
      {resume.sectionVisibility.experience && resume.experience.length > 0 && (
        <section style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "0.85em",
              fontWeight: "700",
              textTransform: "uppercase",
              color: accentColor,
              marginBottom: "8px",
              paddingBottom: "4px",
              borderBottom: `1px solid ${accentColor}`,
            }}
          >
            EXPERIENCE
          </h2>
          {resume.experience.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: "12px" }} className="page-break-inside-avoid">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2px",
                }}
              >
                <strong>{exp.title}</strong>
                <span style={{ fontSize: "0.9em" }}>{exp.startDate}</span>
              </div>
              <div style={{ fontStyle: "italic", color: "#666" }}>
                {exp.company}
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.95em" }}>
                {exp.description}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* More sections with same pattern */}
    </div>
  );
}
```

---

## Summary

✅ **What's Already Correct:**
- Puppeteer configuration (screen media, fonts wait, PDF settings)
- Preview route architecture
- Job queueing system

✅ **What to Ensure:**
- Tailwind config includes preview route
- Fonts imported at top of CSS
- No `print:hidden` or `@media print` hiding content
- Dynamic colors use inline styles
- All backgrounds are preserved

✅ **Testing:**
- Generate PDFs and compare to preview
- Check fonts render correctly
- Verify colors and spacing match
- Test with various resumes and templates
