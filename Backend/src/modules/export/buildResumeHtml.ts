import fs from "fs";
import path from "path";

type ResumeSnapshot = Record<string, unknown> & {
  title?: unknown;
  templateId?: unknown;
  personalInfo?: Record<string, unknown>;
  sections?: Record<string, unknown>;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);
const normalizeText = (value: unknown) => String(value ?? "").trim();

const bulletItems = (items: unknown) => asArray(items)
  .map((item) => normalizeText(item))
  .filter(Boolean)
  .map((item) => `<li>${escapeHtml(item)}</li>`)
  .join("");

const resumeSection = (title: string, body: string) => body ? `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </section>
  ` : "";

const buildExperienceSection = (entries: unknown) => {
  const experiences = asArray(entries);
  if (experiences.length === 0) return "";

  return experiences.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const bullets = asArray(item.bullets);
    const description = normalizeText(item.description);
    const current = item.current ? "Current" : "";

    return `
      <div class="item">
        <div class="item-header">
          <div>
            <h3>${escapeHtml(item.role ?? item.name ?? "Experience")}</h3>
            <p class="muted">${escapeHtml(item.company ?? "")} ${item.location ? `• ${escapeHtml(item.location)}` : ""}</p>
          </div>
          <div class="muted align-right">
            <div>${escapeHtml(item.start ?? "")} ${item.end ? `- ${escapeHtml(item.end)}` : current ? "- Present" : ""}</div>
          </div>
        </div>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        ${bullets.length > 0 ? `<ul>${bulletItems(bullets)}</ul>` : ""}
      </div>
    `;
  }).join("");
};

const buildSimpleListSection = (entries: unknown, renderItem: (item: Record<string, unknown>) => string) => {
  const list = asArray(entries);
  if (list.length === 0) return "";

  return list.map((entry) => `<div class="item">${renderItem((entry ?? {}) as Record<string, unknown>)}</div>`).join("");
};

const buildSkillsSection = (entries: unknown) => buildSimpleListSection(entries, (item) => {
  const items = asArray(item.items);
  return `
    <h3>${escapeHtml(item.category ?? "Skills")}</h3>
    <p>${items.map((skill) => `<span class="pill">${escapeHtml(skill)}</span>`).join(" ")}</p>
  `;
});

const buildEducationSection = (entries: unknown) => buildSimpleListSection(entries, (item) => `
  <div class="item-header">
    <div>
      <h3>${escapeHtml(item.degree ?? item.field ?? "Education")}</h3>
      <p class="muted">${escapeHtml(item.institution ?? "")}</p>
    </div>
    <div class="muted align-right">${escapeHtml(item.year ?? "")}${item.cgpa ? `<br/>CGPA ${escapeHtml(item.cgpa)}` : ""}</div>
  </div>
`);

const buildProjectsSection = (entries: unknown) => buildSimpleListSection(entries, (item) => {
  const bullets = asArray(item.bullets);
  return `
    <div class="item-header">
      <div>
        <h3>${escapeHtml(item.name ?? "Project")}</h3>
        ${item.tech ? `<p class="muted">${escapeHtml(item.tech)}</p>` : ""}
      </div>
      ${item.link ? `<div class="muted align-right">${escapeHtml(item.link)}</div>` : ""}
    </div>
    ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
    ${bullets.length > 0 ? `<ul>${bulletItems(bullets)}</ul>` : ""}
  `;
});

const buildLanguagesSection = (entries: unknown) => buildSimpleListSection(entries, (item) => `
  <div class="item-header">
    <h3>${escapeHtml(item.language ?? "Language")}</h3>
    <p class="muted">${escapeHtml(item.proficiency ?? "")}</p>
  </div>
`);

const buildCertificationsSection = (entries: unknown) => buildSimpleListSection(entries, (item) => {
  const url = normalizeText(item.url);
  return `
  <div class="item-header">
    <div>
      <h3>${escapeHtml(item.name ?? "Certification")}</h3>
      <p class="muted">${escapeHtml(item.issuer ?? "")}${url ? ` • <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>` : ""}</p>
    </div>
    <div class="muted align-right">${escapeHtml(item.year ?? "")}</div>
  </div>
`;
});

const mapToSystemFont = (font: string): string => {
  const fontName = font.toLowerCase();

  if (fontName.includes("garamond") || fontName.includes("playfair") || fontName.includes("lora")) {
    return '"Georgia", "Times New Roman", serif';
  }
  if (fontName.includes("dm sans") || fontName.includes("plex") || fontName.includes("nunito") || fontName.includes("outfit")) {
    return '"Segoe UI", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", sans-serif';
  }
  if (fontName.includes("source")) {
    return '"Monaco", "Courier New", monospace';
  }

  return `${font}, "Arial", "Helvetica", sans-serif`;
};

const formatFontFamily = (font: string): string => {
  const mapped = mapToSystemFont(font);
  const trimmed = mapped.trim();
  return trimmed;
};

const getPageMargin = (pageMargin: string): string => {
  const marginMap: Record<string, string> = {
    tight: "28px 32px",
    normal: "40px 48px",
    relaxed: "52px 60px",
    spacious: "64px 72px",
  };
  return marginMap[pageMargin] || marginMap.normal;
};

const getSectionSpacing = (spacing: string): number => {
  const spacingMap: Record<string, number> = {
    compact: 12,
    normal: 20,
    loose: 32,
  };
  return spacingMap[spacing] || spacingMap.normal;
};

export const buildResumeHtml = (resume: ResumeSnapshot, preset: string) => {
  const title = normalizeText(resume.title) || "Resume";
  const personalInfo = (resume.personalInfo ?? {}) as Record<string, unknown>;
  const sections = (resume.sections ?? {}) as Record<string, unknown>;

  const fullName = normalizeText(personalInfo.name) || title;
  const headline = normalizeText(personalInfo.title);
  const summary = normalizeText(personalInfo.summary);

  const style = (resume.style ?? {}) as Record<string, unknown>;
  const accentColor = normalizeText(style.accentColor) || "#1a1a1a";
  const headingColor = normalizeText(style.headingColor) || "#111111";
  const textColor = normalizeText(style.textColor) || "#333333";
  const mutedColor = normalizeText(style.mutedColor) || "#666666";
  const borderColor = normalizeText(style.borderColor) || "#cccccc";
  const backgroundColor = normalizeText(style.backgroundColor) || "#ffffff";
  const bodyFont = formatFontFamily(normalizeText(style.bodyFont) || "EB Garamond, serif");
  const headingFont = formatFontFamily(normalizeText(style.headingFont) || "EB Garamond, serif");
  const fontSize = normalizeText(style.fontSize) || "10.5pt";
  const lineHeight = normalizeText(style.lineHeight) || "1.5";
  const pageMargin = getPageMargin(normalizeText(style.pageMargin) || "normal");
  const sectionSpacing = getSectionSpacing(normalizeText(style.sectionSpacing) || "normal");
  const showDividers = style.showDividers !== false;
  const bulletStyle = normalizeText(style.bulletStyle) || "•";
  const headerAlign = normalizeText(style.headerAlign) || "left";

  const [paddingV, paddingH] = pageMargin.split(" ");

  // Attempt to inline local font files for the primary body and heading fonts if available.
  // Place font packs under `Backend/assets/fonts/{fontname}.woff2` for automatic inlining.
  const embedFontCss = (() => {
    try {
      const assetsDir = path.resolve(__dirname, "../../../../assets/fonts");

      const pickPrimary = (fontDef: string) => {
        return String(fontDef).split(",")[0].replace(/["']/g, "").trim();
      };

      const candidates = [pickPrimary(bodyFont), pickPrimary(headingFont)];
      const seen = new Set<string>();
      const cssParts: string[] = [];

      for (const cand of candidates) {
        if (!cand || seen.has(cand)) continue;
        seen.add(cand);
        const base = cand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const tryNames = [
          `${base}.woff2`,
          `${base}-regular.woff2`,
          `${base}-400.woff2`,
          `${base}.woff`,
        ];

        for (const name of tryNames) {
          const filePath = path.join(assetsDir, name);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const mime = name.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
            const b64 = buf.toString('base64');
            cssParts.push(`@font-face{font-family: '${cand}'; src: url(data:${mime};base64,${b64}) format('${mime.includes('woff2')?'woff2':'woff'}'); font-weight: 400; font-style: normal; font-display: swap;}`);
            break;
          }
        }
      }

      return cssParts.join('\n');
    } catch (err) {
      return "";
    }
  })();

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <!-- Load primary webfonts used by templates to ensure Puppeteer renders glyphs identically -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
        <style>
          ${embedFontCss}
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: ${bodyFont};
            font-size: ${fontSize};
            line-height: ${lineHeight};
            color: ${textColor};
            background: ${backgroundColor};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page { background: #fff; padding: ${paddingV} ${paddingH}; min-height: 100vh; }
          h1, h2, h3, p { margin: 0; }
          h1 { font-family: ${headingFont}; font-size: 28pt; font-weight: 600; letter-spacing: -0.02em; color: ${headingColor}; text-align: ${headerAlign}; }
          h2 { font-family: ${headingFont}; font-size: 13pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: ${accentColor}; margin-bottom: 10px; ${showDividers ? `border-bottom: 1px solid ${borderColor}; padding-bottom: 6px;` : ""} }
          h3 { font-family: ${headingFont}; font-size: 10.5pt; font-weight: 600; color: ${headingColor}; margin-bottom: 4px; }
          p { margin: 4px 0; page-break-inside: avoid; break-inside: avoid; }
          .headline { margin-top: 8px; color: ${mutedColor}; font-size: 10pt; text-align: ${headerAlign}; }
          .meta { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 12px; font-size: 9pt; color: ${mutedColor}; justify-content: ${headerAlign === "center" ? "center" : "flex-start"}; }
          .section { padding-top: ${sectionSpacing}px; page-break-before: auto; }
          .item { margin-bottom: 12px; }
          .item-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .muted { color: ${mutedColor}; font-size: 9pt; }
          .align-right { text-align: right; }
          ul { margin: 8px 0 0 18px; padding: 0; list-style: none; }
          li { margin-bottom: 3px; font-size: ${fontSize}; display: flex; align-items: flex-start; gap: 8px; page-break-inside: avoid; break-inside: avoid; }
          li::before { content: "${bulletStyle}"; }
          h2 { page-break-after: avoid; break-after: avoid; }
          .pill { display: inline-block; background: ${accentColor}20; color: ${accentColor}; padding: 4px 8px; border-radius: 999px; font-size: 9pt; margin: 0 6px 6px 0; }
          .two-col { display: grid; grid-template-columns: 2.1fr 1fr; gap: 18px; }
          @media print { body { background: #fff; } .page { border-radius: 0; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div style="margin-bottom: ${sectionSpacing}px;">
            <h1>${escapeHtml(fullName)}</h1>
            ${headline ? `<div class="headline">${escapeHtml(headline)}</div>` : ""}
            <div class="meta">
              ${personalInfo.email ? `<span>${escapeHtml(personalInfo.email)}</span>` : ""}
              ${personalInfo.phone ? `<span>${escapeHtml(personalInfo.phone)}</span>` : ""}
              ${personalInfo.location ? `<span>${escapeHtml(personalInfo.location)}</span>` : ""}
              ${personalInfo.linkedin ? `<span>${escapeHtml(personalInfo.linkedin)}</span>` : ""}
              ${personalInfo.github ? `<span>${escapeHtml(personalInfo.github)}</span>` : ""}
              ${personalInfo.portfolio ? `<span>${escapeHtml(personalInfo.portfolio)}</span>` : ""}
            </div>
          </div>
          <div class="two-col">
            <div>
              ${resumeSection("Summary", summary ? `<p>${escapeHtml(summary)}</p>` : "")}
              ${resumeSection("Experience", buildExperienceSection(sections.experience))}
              ${resumeSection("Projects", buildProjectsSection(sections.projects))}
            </div>
            <div>
              ${resumeSection("Skills", buildSkillsSection(sections.skills))}
              ${resumeSection("Education", buildEducationSection(sections.education))}
              ${resumeSection("Certifications", buildCertificationsSection(sections.certifications))}
              ${resumeSection("Languages", buildLanguagesSection(sections.languages))}
            </div>
          </div>
          <div class="muted" style="margin-top: 18px;">Generated with preset ${escapeHtml(preset)} on ${escapeHtml(new Date().toISOString())}</div>
        </div>
      </body>
    </html>
  `;
};

export default buildResumeHtml;
