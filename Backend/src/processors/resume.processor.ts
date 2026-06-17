import { createResumeDownloadFileName, resolveResumeDownloadUrl, type ResumeDownloadJobData } from "../../../shared/src/jobs";
import { env } from "../config/env";
import crypto from "crypto";
import { browserPool } from "../lib/browserPool";
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

// buildResumeHtml is provided by the centralized builder module

export const generateResumePdfArtifact = async (
  resume: ResumeSnapshot,
  preset: string,
  jobId: string,
  previewToken?: string,
  options?: { timeoutMs?: number },
): Promise<ResumeDownloadArtifact> => {
  const timeoutMs = options?.timeoutMs ?? env.RESUME_DOWNLOAD_JOB_TIMEOUT_MS ?? 120000;
  if (browserPool.size === 0) {
    await browserPool.start();
  }
  const browser = await browserPool.acquire();
  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | null = null;
  const fileName = createResumeDownloadFileName(jobId);
  const frontendBase = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const tokenParam = previewToken ?? "";
  const previewUrl = tokenParam
    ? `${frontendBase}/resume/export/${encodeURIComponent(jobId)}?previewToken=${encodeURIComponent(tokenParam)}`
    : `${frontendBase}/resume/export/${encodeURIComponent(jobId)}`;
  let pdfBuffer: Buffer | null = null;

  try {
    if (timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
      }, timeoutMs);
    }
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      await page.emulateMediaType("print");

      try {
        await page.goto(previewUrl, { waitUntil: "networkidle2", timeout: 25000 });
        await page.waitForSelector("#resume-export-root", { timeout: 15000 });
      } catch (error) {
        logger.error({ error, jobId, previewUrl }, "Failed to load frontend resume export page");
        throw new Error(`Frontend resume export page unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        // Ensure fonts and network resources are settled before generating PDF
        await page.waitForFunction('document.fonts && document.fonts.ready && document.fonts.ready.then', { timeout: 7000 }).catch(() => undefined);
        const fontLoadPromise = page.evaluateHandle("document.fonts.ready");
        await Promise.race([
          fontLoadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Font loading timeout")), 7000)),
        ]).catch(() => undefined);
        // Allow any late-loading images to settle briefly
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        logger.debug({ jobId, err }, "document.fonts.ready timed out or failed, continuing");
      }

      logger.debug({ jobId, previewUrl }, "Resume PDF render source loaded from frontend export page");

      try {
        await page.evaluate(() => {
          void document.body.offsetHeight;
        });
      } catch (err) {
        logger.debug({ jobId, err }, "Layout recalculation failed");
      }

      // Attempt PDF generation with a small retry in case of transient rendering issues
      const maxPdfAttempts = 2;
      for (let attempt = 1; attempt <= maxPdfAttempts; attempt += 1) {
        try {
          const generatedBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
            scale: 1,
          });

          pdfBuffer = Buffer.isBuffer(generatedBuffer) ? generatedBuffer : Buffer.from(generatedBuffer);
          break;
        } catch (err) {
          logger.warn({ jobId, attempt, err }, "PDF generation attempt failed");
          if (attempt < maxPdfAttempts) {
            await new Promise((r) => setTimeout(r, 300 * attempt));
          } else {
            throw err;
          }
        }
      }
    } finally {
      await page.close().catch(() => undefined);
    }
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle as NodeJS.Timeout);
  }

  if (timedOut) {
    throw new Error("Resume PDF generation timeout");
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

export const processResumeDownloadJob = async (job: { id: string; data: ResumeDownloadJobData; attemptsMade: number; opts: { attempts: number } }) => {
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
    const previewToken = crypto.randomBytes(12).toString("hex");
    await ResumeDownloadJob.updateOne({ jobId: String(job.id) }, { $set: { previewToken } });

    // Guard against indefinite PDF generation by enforcing a timeout.
    const timeoutMs = env.RESUME_DOWNLOAD_JOB_TIMEOUT_MS ?? 120000;
    const artifact = await generateResumePdfArtifact(job.data.resume as ResumeSnapshot, job.data.preset, String(job.id), previewToken, { timeoutMs });

    const pdfSizeBytes = artifact.pdfBuffer.length;
    const pdfSizeMb = pdfSizeBytes / (1024 * 1024);
    const maxDocumentSizeBytes = 16 * 1024 * 1024;

    logger.debug({
      jobId: job.id,
      pdfBufferSize: pdfSizeBytes,
      pdfSizeMb: pdfSizeMb.toFixed(2),
      pdfBufferType: typeof artifact.pdfBuffer,
      isBuffer: Buffer.isBuffer(artifact.pdfBuffer),
    }, "Generated PDF artifact");

    if (pdfSizeBytes > maxDocumentSizeBytes) {
      logger.warn({ jobId: job.id, pdfSizeBytes, maxSize: maxDocumentSizeBytes, note: "PDF exceeds MongoDB 16MB document limit - consider using GridFS" }, "PDF file size exceeds limit");
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

    logger.info({ jobId: job.id, durationMs: Date.now() - startedAt, fileSize: pdfSizeBytes, fileSizeMb: pdfSizeMb.toFixed(2), mongoUpdateResult: { modifiedCount: updateResult.modifiedCount, matchedCount: updateResult.matchedCount } }, "Resume download job completed");

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