import type { Job } from "bullmq";
import { createResumeDownloadFileName, resolveResumeDownloadUrl, type ResumeDownloadJobData } from "../../../shared/src/bullmq";
import { env } from "../config/env";
import { launchPuppeteerBrowser } from "../config/puppeteer";
import { logger } from "../observability";
import ResumeDownloadJob from "../models/ResumeDownloadJob";

type ResumeSnapshot = Record<string, unknown> & {
  title?: unknown;
  templateId?: unknown;
  personalInfo?: Record<string, unknown>;
  sections?: Record<string, unknown>;
  style?: Record<string, unknown>;
};

export type ResumeDownloadArtifact = {
  fileName: string;
  pdfBuffer: Buffer;
  resultUrl: string;
  mimeType: "application/pdf";
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

const buildCertificationsSection = (entries: unknown) => buildSimpleListSection(entries, (item) => `
  <div class="item-header">
    <div>
      <h3>${escapeHtml(item.name ?? "Certification")}</h3>
      <p class="muted">${escapeHtml(item.issuer ?? "")}</p>
    </div>
    <div class="muted align-right">${escapeHtml(item.year ?? "")}</div>
  </div>
`);

// Map frontend fonts to system fonts that Puppeteer can render
const mapToSystemFont = (font: string): string => {
  const fontName = font.toLowerCase();
  
  // Map fancy fonts to system equivalents available in headless environments
  if (fontName.includes("garamond") || fontName.includes("playfair") || fontName.includes("lora")) {
    return '"Georgia", "Times New Roman", serif'; // Serif fallback
  }
  if (fontName.includes("dm sans") || fontName.includes("plex") || fontName.includes("nunito") || fontName.includes("outfit")) {
    return '"Segoe UI", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", sans-serif'; // Modern sans-serif
  }
  if (fontName.includes("source")) {
    return '"Monaco", "Courier New", monospace'; // Monospace
  }
  
  // Try to keep the original font but add comprehensive fallbacks
  return `${font}, "Arial", "Helvetica", sans-serif`;
};

// Ensure font family is properly formatted
const formatFontFamily = (font: string): string => {
  const mapped = mapToSystemFont(font);
  const trimmed = mapped.trim();
  // Fonts are already properly formatted from mapToSystemFont
  return trimmed;
};

// Map page margins (matching frontend marginMap)
const getPageMargin = (pageMargin: string): string => {
  const marginMap: Record<string, string> = {
    tight: "28px 32px",
    normal: "40px 48px",
    relaxed: "52px 60px",
    spacious: "64px 72px",
  };
  return marginMap[pageMargin] || marginMap.normal;
};

// Map section spacing (matching frontend spacingMap)
const getSectionSpacing = (spacing: string): number => {
  const spacingMap: Record<string, number> = {
    compact: 12,
    normal: 20,
    loose: 32,
  };
  return spacingMap[spacing] || spacingMap.normal;
};

const buildResumeHtml = (resume: ResumeSnapshot, preset: string) => {
  const title = normalizeText(resume.title) || "Resume";
  const personalInfo = (resume.personalInfo ?? {}) as Record<string, unknown>;
  const sections = (resume.sections ?? {}) as Record<string, unknown>;

  const fullName = normalizeText(personalInfo.name) || title;
  const headline = normalizeText(personalInfo.title);
  const summary = normalizeText(personalInfo.summary);

  const style = (resume.style ?? {}) as Record<string, unknown>;
  
  // Extract ALL style properties with defaults matching frontend
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
  const showDividers = style.showDividers !== false; // Default true
  const bulletStyle = normalizeText(style.bulletStyle) || "•";
  const headerAlign = normalizeText(style.headerAlign) || "left";

  const [paddingV, paddingH] = pageMargin.split(" ");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 14mm; }
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
          .page {
            background: #fff;
            padding: ${paddingV} ${paddingH};
            min-height: 100vh;
          }
          h1, h2, h3, p { margin: 0; }
          h1 { 
            font-family: ${headingFont}; 
            font-size: 28pt; 
            font-weight: 600;
            letter-spacing: -0.02em;
            color: ${headingColor};
            text-align: ${headerAlign};
          }
          h2 { 
            font-family: ${headingFont}; 
            font-size: 13pt; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: ${accentColor}; 
            margin-bottom: 10px;
            ${showDividers ? `border-bottom: 1px solid ${borderColor}; padding-bottom: 6px;` : ""}
          }
          h3 { 
            font-family: ${headingFont}; 
            font-size: 10.5pt; 
            font-weight: 600;
            color: ${headingColor};
            margin-bottom: 4px; 
          }
          p { margin: 4px 0; }
          .headline { 
            margin-top: 8px; 
            color: ${mutedColor}; 
            font-size: 10pt;
            text-align: ${headerAlign};
          }
          .meta { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 10px 16px; 
            margin-top: 12px; 
            font-size: 9pt; 
            color: ${mutedColor};
            justify-content: ${headerAlign === "center" ? "center" : "flex-start"};
          }
          .section { margin-top: ${sectionSpacing}px; }
          .item { margin-bottom: 12px; }
          .item-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .muted { color: ${mutedColor}; font-size: 9pt; }
          .align-right { text-align: right; }
          .bullet::before { content: "${bulletStyle} "; }
          ul { margin: 8px 0 0 18px; padding: 0; list-style: none; }
          li { margin-bottom: 3px; font-size: ${fontSize}; display: flex; align-items: flex-start; gap: 8px; }
          li::before { content: "${bulletStyle}"; }
          .pill { display: inline-block; background: ${accentColor}20; color: ${accentColor}; padding: 4px 8px; border-radius: 999px; font-size: 9pt; margin: 0 6px 6px 0; }
          .two-col { display: grid; grid-template-columns: 2.1fr 1fr; gap: 18px; }
          @media print {
            body { background: #fff; }
            .page { border-radius: 0; }
          }
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

export const generateResumePdfArtifact = async (resume: ResumeSnapshot, preset: string, jobId: string): Promise<ResumeDownloadArtifact> => {
  const browser = await launchPuppeteerBrowser();
  const fileName = createResumeDownloadFileName(jobId);
  const html = buildResumeHtml(resume, preset);
  let pdfBuffer: Buffer | null = null;

  try {
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });
      
      // Set media type BEFORE content for proper print styling
      await page.emulateMediaType("print");
      
      // Set content and wait for network to be idle (fonts and resources loading)
      await page.setContent(html, { 
        waitUntil: "networkidle2",
        timeout: 30000 
      });

      // Wait for fonts to load (Google Fonts or system fonts)
      await page.waitForFunction(
        () => {
          const computedStyle = window.getComputedStyle(document.body);
          return computedStyle.fontFamily && computedStyle.fontFamily !== 'sans-serif';
        },
        { timeout: 5000 }
      ).catch(() => {
        // Font loading timeout - continue anyway with fallback fonts
        logger.debug({ jobId }, "Font loading timeout, continuing with fallback fonts");
      });

      // Small delay to ensure CSS is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      const generatedBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "12mm",
          right: "12mm",
          bottom: "12mm",
          left: "12mm",
        },
      });

      pdfBuffer = Buffer.isBuffer(generatedBuffer) ? generatedBuffer : Buffer.from(generatedBuffer);
    } finally {
      await page.close().catch(() => undefined);
    }
  } finally {
    await browser.close().catch((error) => {
      logger.warn({ error }, "Failed to close Puppeteer browser after PDF generation");
    });
  }

  if (!pdfBuffer) {
    throw new Error("Failed to generate resume PDF buffer");
  }

  return {
    fileName,
    pdfBuffer,
    resultUrl: resolveResumeDownloadUrl(jobId),
    mimeType: "application/pdf",
  };
};

export const processResumeDownloadJob = async (job: Job<ResumeDownloadJobData>) => {
  const startedAt = Date.now();

  await ResumeDownloadJob.updateOne(
    { jobId: String(job.id) },
    {
      $set: {
        status: "pending",
        startedAt: new Date(),
        attemptsMade: job.attemptsMade,
        totalAttempts: job.opts.attempts ?? env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
      },
    },
    { upsert: true },
  );

  try {
    const artifact = await generateResumePdfArtifact(job.data.resume as ResumeSnapshot, job.data.preset, String(job.id));

    const pdfSizeBytes = artifact.pdfBuffer.length;
    const pdfSizeMb = pdfSizeBytes / (1024 * 1024);
    const maxDocumentSizeBytes = 16 * 1024 * 1024; // MongoDB default 16MB limit

    logger.debug({
      jobId: job.id,
      pdfBufferSize: pdfSizeBytes,
      pdfSizeMb: pdfSizeMb.toFixed(2),
      pdfBufferType: typeof artifact.pdfBuffer,
      isBuffer: Buffer.isBuffer(artifact.pdfBuffer),
    }, "Generated PDF artifact");

    if (pdfSizeBytes > maxDocumentSizeBytes) {
      logger.warn({
        jobId: job.id,
        pdfSizeBytes,
        maxSize: maxDocumentSizeBytes,
        note: "PDF exceeds MongoDB 16MB document limit - consider using GridFS",
      }, "PDF file size exceeds limit");
    }

    const updateResult = await ResumeDownloadJob.updateOne(
      { jobId: String(job.id) },
      {
        $set: {
          status: "completed",
          resultUrl: artifact.resultUrl,
          fileName: artifact.fileName,
          fileData: artifact.pdfBuffer,
          attemptsMade: job.attemptsMade + 1,
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
          lastError: "",
        },
      },
    );

    logger.info({
      jobId: job.id,
      durationMs: Date.now() - startedAt,
      fileSize: pdfSizeBytes,
      fileSizeMb: pdfSizeMb.toFixed(2),
      mongoUpdateResult: { modifiedCount: updateResult.modifiedCount, matchedCount: updateResult.matchedCount },
    }, "Resume download job completed");

    // Verify the data was saved correctly
    const savedJob = await ResumeDownloadJob.findOne({ jobId: String(job.id) }).lean();
    if (!savedJob?.fileData) {
      logger.error({ jobId: job.id }, "File data was not saved to database after update");
    } else {
      const savedSize = Buffer.isBuffer(savedJob.fileData) ? savedJob.fileData.length : 0;
      logger.debug({ jobId: job.id, savedFileSize: savedSize }, "Verified file data was saved");
    }

    return { resultUrl: artifact.resultUrl };
  } catch (error) {
    await ResumeDownloadJob.updateOne(
      { jobId: String(job.id) },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          attemptsMade: job.attemptsMade + 1,
          lastError: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        },
      },
    );

    logger.error({ error, jobId: job.id }, "Resume download job failed");
    throw error;
  }
};
