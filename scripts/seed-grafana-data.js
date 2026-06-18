/**
 * Grafana Data Generator — High Volume
 *
 * Generates sustained synthetic traffic to populate all OTel/Prometheus metrics.
 * Hits every instrumented endpoint with realistic payloads at configurable concurrency.
 *
 * Usage:
 *   node scripts/seed-grafana-data.js
 *   node scripts/seed-grafana-data.js --duration 600 --concurrency 5 --burst 20
 *
 * Options:
 *   --duration     Total run time in seconds (default: 300)
 *   --concurrency  Parallel user sessions (default: 5)
 *   --burst        Requests per session per cycle (default: 20)
 *   --base         API base URL override
 *   --admin-email  Admin email for admin route access
 *   --admin-pass   Admin password
 *
 * Environment variables:
 *   API_BASE, ADMIN_EMAIL, ADMIN_PASS (fallbacks)
 */

/* ── Config ─────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : (process.env[name.toUpperCase().replace(/-/g, "_")] || def);
};

const BASE = getArg("base", "https://resume-builder-project-tcn8.onrender.com/api");
const DURATION = parseInt(getArg("duration", "300"), 10);          // 5 min
const BURST = parseInt(getArg("burst", "20"), 10);                 // 20 req/cycle
const ADMIN_EMAIL = getArg("admin-email", "workmailforaws123@gmail.com");
const ADMIN_PASS = getArg("admin-pass", "12345678aA@");

/* ── Helpers ─────────────────────────────────────────────────── */

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cookie jar for auth (accessToken + refreshToken + csrfToken)

const NAMES = [
  "Alice Johnson","Bob Smith","Carol Williams","David Brown",
  "Eva Martinez","Frank Garcia","Grace Lee","Henry Wilson",
  "Ivy Anderson","Jack Taylor","Karen Thomas","Leo Jackson",
  "Mia White","Noah Harris","Olivia Martin","Peter Thompson",
];
const JOB_TITLES = [
  "Software Engineer","Product Manager","Data Scientist","UX Designer",
  "DevOps Engineer","Engineering Manager","Full Stack Developer",
  "Marketing Director","Sales Executive","CTO","VP of Engineering",
];
const COMPANIES = [
  "TechCorp","DataFlow Inc","CloudBase","InnoSoft","NexGen Systems",
  "Alpha Digital","Beta Analytics","Gamma Tech","Delta Solutions",
];
const TEMPLATES = [
  "classic","modern","compact","sidebar","chronological","functional",
  "executive","scholarly","research","combination","professional","traditional",
];
const BULLETS = [
  "Led a team of 5 engineers to deliver a microservices architecture reducing deployment time by 60%",
  "Implemented CI/CD pipeline using GitHub Actions, cutting release cycle from 2 weeks to 2 days",
  "Designed and built RESTful APIs serving 10M+ requests/day with 99.9% uptime",
  "Optimized database queries reducing page load time from 3s to 200ms",
  "Mentored 3 junior developers through structured code reviews and pair programming sessions",
  "Built real-time data pipeline processing 100k events/sec using Kafka and Spark",
  "Reduced infrastructure costs by 40% through Kubernetes resource optimization",
  "Developed A/B testing framework used by 4 product teams across 20+ experiments",
  "Created monitoring dashboards reducing Mean Time to Detection from 30min to 2min",
];
const SKILLS = [
  { category: "Languages", items: ["TypeScript","Python","Go","Rust","Java"] },
  { category: "Frameworks", items: ["React","Node.js","Next.js","Express","Django"] },
  { category: "Cloud", items: ["AWS","GCP","Azure","Docker","Kubernetes"] },
  { category: "Databases", items: ["PostgreSQL","MongoDB","Redis","Elasticsearch"] },
  { category: "Tools", items: ["Git","GitHub Actions","Terraform","Prometheus"] },
];

/* ── API client with cookie/CSRF support ────────────────────── */

const counters = { ok: 0, clientErr: 0, serverErr: 0, netErr: 0 };

// Cookie jar: { cookie: "raw cookie string", csrfToken: "..." }
let cookieJar = { cookie: "", csrfToken: "" };

function parseSetCookie(setCookie) {
  if (!setCookie) return;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const [nameEqVal] = c.split(";");
    const [name, ...rest] = nameEqVal.split("=");
    const val = rest.join("=");
    if (name === "csrfToken") {
      cookieJar.csrfToken = val;
    }
  }
  // Rebuild Cookie header from all Set-Cookie values
  const parts = cookies.map((c) => c.split(";")[0]);
  cookieJar.cookie = parts.join("; ");
}

async function api(method, path, body, useAuth = true) {
  const url = `${BASE}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (useAuth && cookieJar.cookie) {
    headers["Cookie"] = cookieJar.cookie;
    if (cookieJar.csrfToken) {
      headers["X-CSRF-Token"] = cookieJar.csrfToken;
    }
  }
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    const code = Math.floor(res.status / 100);
    if (code === 2) counters.ok++;
    else if (code === 4) counters.clientErr++;
    else if (code === 5) counters.serverErr++;
    // Capture Set-Cookie headers
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) parseSetCookie(setCookie);
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } catch {
    counters.netErr++;
    return { status: 0, ok: false, data: null };
  }
}

/* ── Payload factories ──────────────────────────────────────── */

function makeResumePayload() {
  const name = pick(NAMES);
  const title = pick(JOB_TITLES);
  return {
    title: `${name}'s Resume`,
    templateId: pick(TEMPLATES),
    personalInfo: {
      name, title,
      email: `seed_${Date.now()}_${rand(1000,9999)}@example.com`,
      phone: `+1${rand(200,999)}${rand(100,999)}${rand(1000,9999)}`,
      location: `${pick(["San Francisco","New York","Austin","Seattle","Chicago"])}, ${pick(["CA","NY","TX","WA","IL"])}`,
      summary: `Senior ${title} with ${rand(5,15)}+ years of experience.`,
      linkedin: "https://linkedin.com/in/example",
      github: "https://github.com/example",
    },
    sections: {
      experience: [
        {
          role: title, company: pick(COMPANIES),
          location: pick(["Remote","San Francisco, CA"]),
          start: `${2020 - rand(0,4)}-0${rand(1,6)}`, end: "present", current: true,
          bullets: Array.from({ length: rand(3,5) }, () => pick(BULLETS)),
          contentMode: "bullets",
        },
      ],
      education: [{
        institution: pick(["Stanford","MIT","UC Berkeley","CMU","Georgia Tech"]),
        degree: pick(["B.S.","M.S."]), field: "Computer Science",
        year: `${2014 + rand(0,6)}`, cgpa: `${rand(3,4)}.${rand(0,9)}`,
      }],
      skills: SKILLS.map((s) => ({
        category: s.category,
        items: Array.from({ length: rand(2,3) }, () => pick(s.items)),
      })),
      projects: [{
        name: pick(["Cloud Platform","Analytics Dashboard","API Gateway","ML Serving Platform"]),
        link: "https://github.com/example/proj",
        technologies: ["TypeScript","React","Go","K8s","PostgreSQL"],
        bullets: Array.from({ length: rand(2,3) }, () => pick(BULLETS)),
        contentMode: "bullets",
      }],
      certifications: [{
        name: pick(["AWS SA","K8s Admin","GCP Engineer","Terraform Associate"]),
        issuer: pick(["Amazon","Google","CNCF","HashiCorp"]),
        year: `${2020 + rand(0,4)}`,
      }],
      languages: [],
    },
    sectionVisibility: { experience: true, education: true, skills: true, projects: true, certifications: true, languages: false },
    style: {
      accentColor: pick(["#2563EB","#059669","#D97706","#7C3AED"]),
      font: "inter", fontSize: "10pt", lineHeight: 1.5,
      pageMargin: "normal", sectionSpacing: "normal",
      showDividers: true, headerAlign: "left", bulletStyle: "•",
      backgroundColor: "#ffffff", textColor: "#1c1c1c",
      headingColor: "#111827", mutedColor: "#6B7280", borderColor: "#E5E7EB",
    },
  };
}

/* ── Traffic generation ─────────────────────────────────────── */

async function loginAsAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.log("  ADMIN_EMAIL/PASS not set — using unauthenticated requests only");
    return false;
  }
  const r = await api("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS }, false);
  if (r.ok && cookieJar.cookie) {
    console.log(`  Logged in as ${ADMIN_EMAIL}`);
    return true;
  }
  console.log(`  Login failed (${r.status}): ${JSON.stringify(r.data).slice(0, 200)}`);
  return false;
}
async function generateTrafficBatch(cycle) {
  const tasks = [];

  // ── Public endpoints (every cycle) ────────────────────────
  tasks.push(api("GET", "/health", null, false));
  tasks.push(api("GET", "/health/uptime", null, false));
  tasks.push(api("GET", "/health/metrics", null, false));
  tasks.push(api("GET", "/templates", null, false));

  // ── Auth endpoints (uses cookie jar) ──────────────────────
  tasks.push(api("GET", "/auth/me", null, true));

  // Failed login attempts — generates user_login_failures_total + http_requests_total
  tasks.push(api("POST", "/auth/login", { email: `nonexistent_${rand(1,99999)}@x.com`, password: "wrong" }, false));
  tasks.push(api("POST", "/auth/login", { email: ADMIN_EMAIL, password: "WrongPass1!" }, false));

  // Successful login (every 3rd cycle) — generates user_logins_total
  if (cycle % 3 === 0) {
    tasks.push(api("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS }, false));
  }

  // Signup attempts (generates user_signups_total)
  if (rand(0, 2) === 0) {
    tasks.push(api("POST", "/auth/signup", {
      name: pick(NAMES),
      email: `seed_signup_${Date.now()}_${rand(1000,9999)}@example.com`,
      password: "Test@123!",
    }, false));
  }

  // ── Resume CRUD (every other cycle) ───────────────────────
  const doFullCycle = cycle % 2 === 0;
  let resumeId = null;

  if (doFullCycle) {
    const createRes = await api("POST", "/resumes", makeResumePayload(), true);
    if (createRes.ok && createRes.data?.resume?._id) {
      resumeId = createRes.data.resume._id;
      tasks.push(api("GET", `/resumes/${resumeId}`, null, true));
      tasks.push(api("GET", "/resumes", null, true));

      // ATS analysis
      tasks.push(api("POST", `/resumes/${resumeId}/analyze-ats`, {
        jobDescription: `Looking for a ${pick(JOB_TITLES)} with ${rand(3,10)}+ years experience in ${pick(["TypeScript","Python","Go","AWS"])} and ${pick(["React","Docker","K8s","PostgreSQL"])}.`,
      }, true));

      // PDF export
      tasks.push(api("POST", `/resumes/${resumeId}/export`, { format: "pdf", preset: pick(["standard","compact","detailed"]) }, true));

      // Duplicate ATS (tests idempotency)
      if (rand(0, 2) === 0) {
        tasks.push(api("POST", `/resumes/${resumeId}/analyze-ats`, {
          jobDescription: `Duplicate analysis request for ${pick(JOB_TITLES)} position.`,
        }, true));
      }

      // Update + re-fetch
      tasks.push(api("PUT", `/resumes/${resumeId}`, { title: `Updated Resume v${cycle}` }, true));
      tasks.push(api("GET", `/resumes/${resumeId}`, null, true));

      // Delete sometimes
      if (rand(0, 4) === 0) {
        tasks.push(api("DELETE", `/resumes/${resumeId}`, null, true));
      }
    }
  }

  // ── AI text improvement (every 3rd cycle, not every burst) ─
  if (cycle % 3 === 0) {
    tasks.push(api("POST", "/ai/improve-text", {
      text: pick(["Led a team of engineers", "Built scalable microservices", "Reduced deployment time"]),
      context: pick(["resume", "cover-letter"]),
      tone: pick(["professional", "confident", "concise"]),
    }, true));

    // Bad AI request (generates provider/validation errors)
    if (rand(0, 2) === 0) {
      tasks.push(api("POST", "/ai/improve-text", { text: "", context: "resume", tone: "professional" }, true));
    }
  }

  // ── Client metrics (every cycle) ──────────────────────────
  const metricNames = ["LCP","FID","CLS","spa_navigation","heapUsed","heapTotal","api_resume_load","api_ai_request"];
  tasks.push(api("POST", "/client-metrics", {
    metrics: Array.from({ length: rand(5,12) }, () => ({
      name: pick(metricNames), value: rand(10, 8000),
      unit: pick(["ms","score","bytes"]),
      context: { type: pick(["web-vital","navigation","memory","api"]) },
      timestamp: new Date().toISOString(),
    })),
  }, false));

  // ── Error reports (every cycle) ───────────────────────────
  tasks.push(api("POST", "/client-error", {
    message: pick(["TypeError: Cannot read property 'foo' of null","NetworkError: Failed to fetch /api/resumes","ReferenceError: process is not defined","ChunkLoadError: Loading chunk 42 failed","Error: Minified React error #185"]),
    source: pick(["react-boundary","window-error","unhandled-rejection","chunk-load"]),
    url: `${BASE.replace("/api","")}/${pick(["builder","resumes","templates","dashboard","settings"])}`,
    userAgent: "Mozilla/5.0 SeedScript/1.0",
    stack: pick(["at Component.render","at Object.invoke","at HTMLButtonElement.onclick",""]),
    breadcrumbs: Array.from({ length: rand(3,8) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      message: pick(["app_start","route_change","api_call_start","api_call_end","user_click"]),
      level: i === 0 ? "error" : "info",
    })),
  }, false));

  // ── Logs (every cycle) ───────────────────────────────────
  tasks.push(api("POST", "/logs/ingest", {
    logs: Array.from({ length: rand(2,5) }, () => ({
      timestamp: new Date().toISOString(),
      level: rand(0, 4),
      message: pick(["Page loaded: /builder","API request: GET /resumes","User action: export PDF","Navigation to /templates","Suspicious activity detected","Cache miss for templates","Rate limit triggered"]),
      context: { source: "frontend" },
    })),
  }, false));

  // ── Invalid / error paths ─────────────────────────────────
  if (rand(0, 3) === 0) {
    tasks.push(api("GET", `/nonexistent/${rand(100,999)}`, null, false));
    tasks.push(api("POST", `/resumes/invalid-id-format/analyze-ats`, { jobDescription: "test" }, true));
  }

  // ── Malformed requests ────────────────────────────────────
  if (rand(0, 4) === 0) {
    tasks.push(api("POST", "/auth/signup", { name: "", email: "not-an-email", password: "short" }, false));
    tasks.push(api("POST", "/resumes", { invalid: true }, true));
  }

  await Promise.allSettled(tasks);
}

/* ── Main loop ──────────────────────────────────────────────── */

async function main() {
  console.log(`\n=============================================`);
  console.log(`  Grafana Data Generator — High Volume`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Duration: ${DURATION}s`);
  console.log(`  Burst: ${BURST} req/cycle`);
  console.log(`  Auth: ${ADMIN_EMAIL ? `${ADMIN_EMAIL} (cookie-based)` : "none"}`);
  console.log(`=============================================\n`);

  const startTime = Date.now();
  let cycles = 0;

  // Login as admin to establish cookie jar (accessToken, refreshToken, csrfToken)
  const authed = await loginAsAdmin();

  // Warmup
  console.log("  Warmup cycle...");
  await generateTrafficBatch(0);

  // Main loop
  let cycle = 1;
  while (Date.now() - startTime < DURATION * 1000) {
    const batch = [];
    for (let b = 0; b < BURST; b++) {
      batch.push(generateTrafficBatch(cycle));
    }
    await Promise.allSettled(batch);
    cycles++;
    cycle++;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const pct = (elapsed / DURATION * 100).toFixed(0);
    process.stdout.write(`\r  Cycle ${cycles} | ${elapsed}s / ${DURATION}s (${pct}%) | OK:${counters.ok} 4xx:${counters.clientErr} 5xx:${counters.serverErr} NET:${counters.netErr}   `);
  }

  // Seed AI diagnostic metrics (hallucinations, malformed responses, provider errors)
  const seedRes = await api("POST", "/admin/observability/seed-ai-metrics", null, true);
  if (seedRes.ok) {
    console.log(`\n  AI diagnostic metrics seeded: ${JSON.stringify(seedRes.data?.counts || {})}`);
  } else {
    console.log(`\n  AI diagnostic seeding skipped (${seedRes.status})`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Done! ${cycles} cycles in ${totalTime}s`);
  console.log(`  Total requests: ${counters.ok + counters.clientErr + counters.serverErr + counters.netErr}`);
  console.log(`    OK: ${counters.ok}  |  4xx: ${counters.clientErr}  |  5xx: ${counters.serverErr}  |  NET: ${counters.netErr}`);
  console.log(`  Check Grafana now.\n`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
