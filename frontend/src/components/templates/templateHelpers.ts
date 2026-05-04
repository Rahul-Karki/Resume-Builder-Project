import React from "react";
import type { CertEntry, Project, WorkEntry } from "@/types/resume-types";

export function formatDateRange(start: string, end: string, current: boolean): string {
  const from = start.trim();
  const to = current ? "Present" : end.trim();

  if (!from && !to) return "";
  if (!from) return to;
  if (!to) return from;
  return `${from} - ${to}`;
}

export function formatProjectTech(project: Project): string {
  return project.tech
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .join(" · ");
}

export function formatCertification(certification: CertEntry): string {
  const issuer = certification.issuer?.trim();
  const year = certification.year?.trim();

  if (issuer && year) return `${certification.name} - ${issuer} (${year})`;
  if (issuer) return `${certification.name} - ${issuer}`;
  if (year) return `${certification.name} (${year})`;
  return certification.name;
}

export function getDisplayBullets(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function isParagraphMode(mode: "bullets" | "paragraph"): boolean {
  return mode === "paragraph";
}

export function getExperienceParagraph(entry: WorkEntry): string {
  return entry.description?.trim() ?? "";
}

export function getProjectParagraph(project: Project): string {
  return project.description?.trim() ?? "";
}

function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

export function toAbsoluteUrl(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (hasScheme(value)) return value;
  return `https://${value}`;
}

export function toMailto(rawEmail: string): string {
  const value = (rawEmail ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("mailto:")) return value;
  return `mailto:${value}`;
}

export function toTel(rawPhone: string): string {
  const value = (rawPhone ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("tel:")) return value;
  const normalized = value.replace(/[^\d+]/g, "");
  return `tel:${normalized || value}`;
}

const URL_OR_EMAIL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+|(?:mailto:)?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

export function renderTextWithLinks(text: string): React.ReactNode {
  const value = (text ?? "").trim();
  if (!value) return value;

  const matches = Array.from(value.matchAll(URL_OR_EMAIL_PATTERN));
  if (matches.length === 0) {
    return value;
  }

  let cursor = 0;
  const fragments: React.ReactNode[] = [];

  matches.forEach((match, index) => {
    const matchedText = match[0];
    const start = match.index ?? 0;

    if (start > cursor) {
      fragments.push(value.slice(cursor, start));
    }

    const href = matchedText.includes("@") && !/^https?:\/\//i.test(matchedText) && !/^www\./i.test(matchedText)
      ? toMailto(matchedText)
      : toAbsoluteUrl(matchedText);

    fragments.push(
      React.createElement(
        "a",
        {
          key: `${matchedText}-${index}-${start}`,
          href,
          target: "_blank",
          rel: "noreferrer",
        },
        matchedText,
      ),
    );

    cursor = start + matchedText.length;
  });

  if (cursor < value.length) {
    fragments.push(value.slice(cursor));
  }

  return fragments;
}

export function ExternalLinkIcon() {
  return React.createElement(
    "span",
    {
      "aria-hidden": true,
      style: {
        display: "inline-flex",
        alignItems: "center",
        marginLeft: 4,
        verticalAlign: "text-top",
      },
    },
    React.createElement(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: 12,
        height: 12,
        focusable: "false",
        style: { display: "block" },
      },
      React.createElement("path", {
        fill: "currentColor",
        d: "M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z",
      }),
      React.createElement("path", {
        fill: "currentColor",
        d: "M5 5h6v2H7v10h10v-4h2v6H5V5z",
      }),
    ),
  );
}

export function isLinkedInUrl(url: string): boolean {
  const linkedinPatterns = [
    /linkedin\.com/i,
    /in\.com/i,
  ];
  return linkedinPatterns.some(pattern => pattern.test(url));
}

export function isGitHubUrl(url: string): boolean {
  return /github\.com/i.test(url);
}

export function isPortfolioUrl(url: string): boolean {
  // Portfolio is anything that's not LinkedIn or GitHub
  return !isLinkedInUrl(url) && !isGitHubUrl(url);
}

export function LinkedInIcon({ width = 14, height = 14 }: { width?: number; height?: number } = {}) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width,
      height,
      "aria-hidden": true,
      focusable: "false",
    },
    React.createElement("path", {
      fill: "currentColor",
      d: "M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.68H9.33V9h3.42v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.64 0 4.31 2.4 4.31 5.52v6.23zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z",
    }),
  );
}

export function GitHubIcon({ width = 14, height = 14 }: { width?: number; height?: number } = {}) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width,
      height,
      "aria-hidden": true,
      focusable: "false",
    },
    React.createElement("path", {
      fill: "currentColor",
      d: "M12 .5C5.73.5.75 5.64.75 12.02c0 5.11 3.29 9.45 7.86 10.98.58.11.79-.26.79-.57 0-.28-.01-1.04-.02-2.04-3.2.71-3.87-1.57-3.87-1.57-.52-1.35-1.27-1.71-1.27-1.71-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.67 1.26 3.32.96.1-.75.4-1.26.72-1.55-2.56-.3-5.26-1.3-5.26-5.78 0-1.28.45-2.33 1.19-3.15-.12-.3-.52-1.5.11-3.12 0 0 .97-.31 3.18 1.2.92-.26 1.9-.38 2.88-.38.98 0 1.96.13 2.88.38 2.2-1.51 3.18-1.2 3.18-1.2.63 1.62.23 2.82.11 3.12.74.82 1.19 1.87 1.19 3.15 0 4.49-2.7 5.48-5.28 5.77.41.37.78 1.09.78 2.2 0 1.59-.01 2.88-.01 3.27 0 .31.21.69.8.57 4.56-1.53 7.85-5.87 7.85-10.98C23.25 5.64 18.27.5 12 .5z",
    }),
  );
}

export function PortfolioIcon({ width = 14, height = 14 }: { width?: number; height?: number } = {}) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width,
      height,
      "aria-hidden": true,
      focusable: "false",
    },
    React.createElement("path", {
      fill: "currentColor",
      d: "M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm7.93 9h-3.02a15.7 15.7 0 0 0-1.18-6.02A8.02 8.02 0 0 1 19.93 11zM12 4c1.08 1.46 1.94 3.98 2.28 7H9.72c.34-3.02 1.2-5.54 2.28-7zM4.07 13h3.02c.2 2.1.72 4.2 1.18 6.02A8.02 8.02 0 0 1 4.07 13zm3.02-2H4.07a8.02 8.02 0 0 1 4.2-6.02A15.7 15.7 0 0 0 7.09 11zm2.63 2h4.56c-.34 3.02-1.2 5.54-2.28 7-1.08-1.46-1.94-3.98-2.28-7zm6.39 6.02c.46-1.82.98-3.92 1.18-6.02h3.02a8.02 8.02 0 0 1-4.2 6.02z",
    }),
  );
}

export function getSocialIconComponent(
  url: string,
  options?: { width?: number; height?: number }
): React.ReactNode {
  if (isLinkedInUrl(url)) {
    return LinkedInIcon(options);
  }
  if (isGitHubUrl(url)) {
    return GitHubIcon(options);
  }
  return PortfolioIcon(options);
}
