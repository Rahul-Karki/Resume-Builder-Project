import { compactText, type AtsGrammarFinding } from "../../../shared/src/ai";

const ACTION_VERBS = [
  "built",
  "designed",
  "led",
  "implemented",
  "optimized",
  "improved",
  "launched",
  "created",
  "managed",
  "delivered",
  "automated",
  "developed",
  "scaled",
  "reduced",
  "increased",
  "collaborated",
  "architected",
  "streamlined",
];

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|requests)\b/i.test(text);

const getExperienceEntries = (resume: Record<string, unknown>) => {
  const sections = (resume.sections as Record<string, unknown> | undefined) ?? {};
  return Array.isArray(sections.experience) ? (sections.experience as Array<Record<string, unknown>>) : [];
};

export const analyzeGrammarIssues = (resume: Record<string, unknown>): AtsGrammarFinding[] => {
  const findings: AtsGrammarFinding[] = [];

  getExperienceEntries(resume).forEach((entry, expIndex) => {
    const bullets = Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : [];

    bullets.forEach((bullet, bulletIndex) => {
      if (!bullet) return;

      const firstWord = bullet.split(/\s+/)[0]?.toLowerCase() ?? "";
      const weakOpening = !ACTION_VERBS.includes(firstWord);
      const missingMetric = !hasMetric(bullet);

      if (!weakOpening && !missingMetric) return;

      findings.push({
        id: `grammar-${expIndex}-${bulletIndex}`,
        path: `sections.experience[${expIndex}].bullets[${bulletIndex}]`,
        originalText: bullet,
        suggestionText: `${ACTION_VERBS.includes(firstWord) ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1) : "Built"} ${bullet.replace(/^\w+\s+/i, "").replace(/\.$/, "")} with measurable impact.`,
        reason: weakOpening ? "Start with a stronger action verb." : "Add measurable impact or scope.",
        severity: missingMetric ? "high" : "medium",
      });
    });
  });

  return findings.slice(0, 12);
};