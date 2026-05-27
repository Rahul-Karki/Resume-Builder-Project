export function AtsTipsPanel({ latestAnalysis, compactInsights }: {
  latestAnalysis: any;
  compactInsights: { icon: string; text: string; tone: string }[];
}) {
  if (latestAnalysis) {
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

    return (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">ATS Suggestions</div>
        {Object.keys(groups).map((key) => (
          <div key={key} className="mb-3">
            <div className="text-sm font-semibold text-zinc-200 mb-2" style={{ textTransform: "capitalize" }}>{key}</div>
            {groups[key].map((g: any) => (
              <div key={g.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm mb-2">
                <div className="text-zinc-100 font-medium">{g.suggestionText}</div>
                <div className="text-zinc-400 text-xs mt-1">{g.reason}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {compactInsights.map((insight, idx) => (
        <div key={idx} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm flex items-center gap-2">
          <span className={insight.tone}>{insight.icon}</span>
          <span className="text-zinc-200">{insight.text}</span>
        </div>
      ))}
    </>
  );
}