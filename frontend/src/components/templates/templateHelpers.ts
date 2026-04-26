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
