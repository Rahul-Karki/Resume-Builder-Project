import React, { useState, useEffect } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { getLatestAtsAnalysis } from "@/services/api";

// ─── Writing Tips Data ──────────────────────────────────────────────────────────

interface WritingTip {
  id: string;
  title: string;
  description: string;
  example?: { before: string; after: string };
  section: "summary" | "experience" | "skills" | "general";
}

const WRITING_TIPS: WritingTip[] = [
  {
    id: "action-verbs",
    title: "Start with strong action verbs",
    description: "Begin each bullet point with a powerful action verb to make your achievements stand out to recruiters and ATS systems.",
    example: {
      before: "Was responsible for managing a team of 5 engineers",
      after: "Led a cross-functional team of 5 engineers, delivering 3 major product releases ahead of schedule",
    },
    section: "experience",
  },
  {
    id: "quantify",
    title: "Quantify your achievements",
    description: "Include numbers, percentages, and metrics to demonstrate the scale and impact of your contributions.",
    example: {
      before: "Improved application performance significantly",
      after: "Reduced API response time by 65%, handling 2.4M daily requests with 99.97% uptime",
    },
    section: "experience",
  },
  {
    id: "summary-formula",
    title: "Use the summary formula",
    description: "Structure your summary as: [Title] with [X years] experience in [key areas]. Proven track record of [top achievements]. Passionate about [relevant interests].",
    example: {
      before: "I am a software engineer who likes building web applications and has experience with React",
      after: "Senior Software Engineer with 7+ years building scalable web applications. Delivered 40% performance gains at Stripe and architected systems serving 10M+ users. Passionate about developer tooling and open-source.",
    },
    section: "summary",
  },
  {
    id: "keywords",
    title: "Weave in role-relevant keywords",
    description: "Naturally incorporate industry keywords and technologies that match the job description. This helps both ATS parsing and recruiter scanning.",
    section: "general",
  },
  {
    id: "skill-categories",
    title: "Organize skills strategically",
    description: "Group skills into 3-4 clear categories (e.g., Languages, Frameworks, Tools, Cloud). Place the most relevant skills first in each category.",
    section: "skills",
  },
  {
    id: "concise-bullets",
    title: "Keep bullets concise and impactful",
    description: "Each bullet should be 1-2 lines max. Focus on the result, not the task. Remove filler words like 'responsible for', 'helped with', 'was involved in'.",
    example: {
      before: "Was involved in the process of migrating the old database system to a new cloud-based solution which helped improve reliability",
      after: "Migrated legacy PostgreSQL cluster to AWS Aurora, achieving 99.99% availability and reducing operational costs by $24K/year",
    },
    section: "experience",
  },
  {
    id: "avoid-pronouns",
    title: "Drop first-person pronouns",
    description: "Resume bullets should omit 'I', 'my', 'we'. Start directly with the verb or noun.",
    section: "general",
  },
  {
    id: "tailor-per-role",
    title: "Tailor for each application",
    description: "Create role-specific variants of your resume. Highlight the most relevant experience and skills for each position you apply to.",
    section: "general",
  },
];

const ACTION_VERBS_BY_CATEGORY: Record<string, string[]> = {
  Leadership: ["Led", "Directed", "Managed", "Orchestrated", "Spearheaded", "Championed", "Mentored", "Coordinated"],
  Technical: ["Architected", "Engineered", "Developed", "Implemented", "Optimized", "Automated", "Debugged", "Refactored"],
  Impact: ["Delivered", "Achieved", "Increased", "Reduced", "Generated", "Improved", "Accelerated", "Streamlined"],
  Creative: ["Designed", "Created", "Innovated", "Pioneered", "Conceptualized", "Prototyped", "Crafted", "Built"],
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function TipCard({ tip }: { tip: WritingTip }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "#09090b", border: "1px solid #27272a", borderRadius: 10,
      marginBottom: 8, overflow: "hidden",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 14px", cursor: "pointer", display: "flex",
          alignItems: "flex-start", gap: 8,
        }}
      >
        <span style={{ color: "#FFFFFF", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✦</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>{tip.title}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{tip.description}</div>
        </div>
        <span style={{
          fontSize: 12, color: "#555", flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}>▾</span>
      </div>
      {expanded && tip.example && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "#0F0F0F", border: "1px solid #27272a",
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.5px" }}>Before</span>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3, textDecoration: "line-through", opacity: 0.8, lineHeight: 1.5 }}>
                {tip.example.before}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#4ADE80", textTransform: "uppercase", letterSpacing: "0.5px" }}>After</span>
              <div style={{ fontSize: 12, color: "#FFFFFF", marginTop: 3, lineHeight: 1.5 }}>
                {tip.example.after}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VerbPalette() {
  const [copiedVerb, setCopiedVerb] = useState<string | null>(null);

  const handleCopy = (verb: string) => {
    navigator.clipboard.writeText(verb);
    setCopiedVerb(verb);
    setTimeout(() => setCopiedVerb(null), 1500);
  };

  return (
    <div>
      {Object.entries(ACTION_VERBS_BY_CATEGORY).map(([category, verbs]) => (
        <div key={category} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            {category}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {verbs.map((verb) => (
              <button
                key={verb}
                onClick={() => handleCopy(verb)}
                title="Click to copy"
                style={{
                  padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: copiedVerb === verb ? "rgba(255,255,255,0.15)" : "#27272a",
                  border: `1px solid ${copiedVerb === verb ? "rgba(255,255,255,0.3)" : "#27272a"}`,
                  color: copiedVerb === verb ? "#FFFFFF" : "#888",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {copiedVerb === verb ? "Copied!" : verb}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResumeChecklist() {
  const { resume } = useResumeBuilderStore();
  const p = resume.personalInfo;
  const s = resume.sections;

  const checks = [
    { label: "Professional summary filled", passed: p.summary.trim().length >= 50 },
    { label: "Summary is 2-4 sentences (120-400 chars)", passed: p.summary.trim().length >= 120 && p.summary.trim().length <= 400 },
    { label: "Has at least 1 work experience", passed: s.experience.length > 0 },
    { label: "Experience bullets have metrics", passed: s.experience.some((e) => e.bullets.some((b) => /\d/.test(b))) },
    { label: "Skills section has 2+ categories", passed: s.skills.length >= 2 },
    { label: "Contact info complete", passed: Boolean(p.name && p.email && (p.phone || p.linkedin)) },
    { label: "LinkedIn profile included", passed: p.linkedin.trim().length > 0 },
    { label: "Education section filled", passed: s.education.length > 0 },
    { label: "No empty bullet points", passed: s.experience.every((e) => e.bullets.every((b) => b.trim().length > 0)) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>
          {passedCount}/{checks.length} checks passed
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: passedCount === checks.length ? "#4ADE80" : passedCount >= 6 ? "#F59E0B" : "#EF4444",
        }}>
          {passedCount === checks.length ? "Excellent" : passedCount >= 6 ? "Good" : "Needs work"}
        </span>
      </div>
      {checks.map((check) => (
        <div key={check.label} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 0", borderBottom: "1px solid #18181b",
        }}>
          <span style={{
            fontSize: 14, color: check.passed ? "#4ADE80" : "#444",
            flexShrink: 0, width: 18, textAlign: "center",
          }}>
            {check.passed ? "●" : "○"}
          </span>
          <span style={{
            fontSize: 12, color: check.passed ? "#888" : "#666",
            fontWeight: check.passed ? 400 : 600,
          }}>
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────

type AiTab = "tips" | "verbs" | "checklist";

export function AiAssistPanel() {
  const [activeTab, setActiveTab] = useState<AiTab>("tips");
  const [filterSection, setFilterSection] = useState<string>("all");
  const { resume } = useResumeBuilderStore();
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
          if (!resume?._id) return;
          const res = await getLatestAtsAnalysis(resume._id);
        if (!mounted) return;
        setLatestAnalysis(res?.analysis ?? null);
      } catch {
        setLatestAnalysis(null);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [resume?.id]);

  const filteredTips = filterSection === "all"
    ? WRITING_TIPS
    : WRITING_TIPS.filter((tip) => tip.section === filterSection);

  return (
    <div style={{ overflowY: "auto", height: "100%", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EFE8" }}>AI Writing Assistant</div>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
          Tips, templates, and tools to write a standout resume
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #27272a", padding: "0 8px", background: "#0A0A0A" }}>
        {([
          { id: "tips" as const, label: "Writing Tips" },
          { id: "verbs" as const, label: "Action Verbs" },
          { id: "checklist" as const, label: "Checklist" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "10px 6px", background: "none", border: "none",
              borderBottom: `2px solid ${activeTab === tab.id ? "#FFFFFF" : "transparent"}`,
              color: activeTab === tab.id ? "#FFFFFF" : "#555",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        {activeTab === "tips" && (
          <>
            {/* If an ATS analysis exists show those suggestions; otherwise show common tips */}
            {latestAnalysis ? (
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>ATS Suggestions</div>
                {(() => {
                  const groups: Record<string, any[]> = {};
                  const suggestions = Array.isArray(latestAnalysis.rewriteSuggestions) ? latestAnalysis.rewriteSuggestions : [];
                  for (const s of suggestions) {
                    const path: string = s.path ?? "general";
                    let key = "general";
                    if (path.startsWith("personalInfo.summary")) key = "summary";
                    else if (path.startsWith("sections.experience")) key = "experience";
                    else if (path.startsWith("sections.skills")) key = "skills";
                    else if (path.startsWith("sections.education")) key = "education";
                    else if (path.startsWith("sections.projects")) key = "projects";
                    else if (path.startsWith("sections.certifications")) key = "certifications";
                    else if (path.startsWith("sections.languages")) key = "languages";

                    groups[key] = groups[key] ?? [];
                    groups[key].push(s);
                  }

                  return Object.keys(groups).map((key) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7", marginBottom: 8, textTransform: "capitalize" }}>{key}</div>
                      {groups[key].map((g: any) => (
                        <div key={g.id} style={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: "#e4e4e7", fontWeight: 700 }}>{g.suggestionText}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{g.reason}</div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <>
                {/* Section filter */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All" },
                    { id: "summary", label: "Summary" },
                    { id: "experience", label: "Experience" },
                    { id: "skills", label: "Skills" },
                    { id: "general", label: "General" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setFilterSection(filter.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${filterSection === filter.id ? "#FFFFFF" : "#27272a"}`,
                        background: filterSection === filter.id ? "rgba(255,255,255,0.1)" : "transparent",
                        color: filterSection === filter.id ? "#FFFFFF" : "#666",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {filteredTips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === "verbs" && (
          <>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 12, lineHeight: 1.5 }}>
              Click any verb to copy it to your clipboard. Use these to start your experience bullets for maximum impact.
            </div>
            <VerbPalette />
          </>
        )}

        {activeTab === "checklist" && <ResumeChecklist />}
      </div>
    </div>
  );
}
