# Template Structure

This project keeps template data in three layers:

1. Backend template records define the canonical data model.
2. Frontend metadata provides fallback templates for the landing page and preview UI.
3. Resume renderers map template ids to layout components and style presets.

## Template Record Shape

The API returns template objects with these important fields:

```ts
{
  layoutId: string;
  name: string;
  description?: string;
  category?: "tech" | "non-tech";
  audience?: "tech" | "non-tech";
  tag?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
  sortOrder?: number;
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
```

## Frontend Fallback Metadata

The landing page uses fallback metadata in `frontend/src/components/landing/TemplatePreview.tsx` so the UI stays usable even when the backend is cold or unreachable.

Example fallback entry:

```ts
{
  id: "classic",
  name: "Classic",
  tag: "Timeless",
  category: "non-tech",
  accent: "#1a1a1a",
  bg: "#FAF8F5",
  primary: "#1a1a1a",
  secondary: "#555",
  desc: "Trusted serif layout for finance, law & academia."
}
```

## Renderer Contract

Each template id should have a corresponding renderer or a safe fallback mapping in the resume renderer layer. When adding a new template:

1. Add the backend record.
2. Add the fallback metadata.
3. Add the renderer/layout support.
4. Verify the export preview and landing carousel still work.

## Style Overrides

`cssVars` lets a template override the default resume style. Keep the values narrow and safe:

- Font family names should match the approved font list.
- Size and spacing values should stay within the supported enum or range.
- Slot booleans should only hide or show supported sections.
