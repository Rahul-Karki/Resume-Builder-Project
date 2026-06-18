/**
 * Grafana Data Generator
 * 
 * Generates synthetic traffic to populate all OTel/Prometheus metrics
 * so your Grafana dashboard shows live data.
 * 
 * Usage:
 *   node scripts/seed-grafana-data.js
 *   node scripts/seed-grafana-data.js --duration 300 --concurrency 3
 * 
 * Environment variables:
 *   API_BASE      - Backend API base URL (default: https://resume-builder-project-tcn8.onrender.com/api)
 *   FRONTEND_URL  - Frontend URL (default: https://resume-builder-project-3h9o.vercel.app) — used in error reports
 *   ADMIN_EMAIL   - Admin email for admin route access (optional)
 *   ADMIN_PASS    - Admin password for admin route access (optional)
 */

const BASE = process.env.API_BASE || "https://resume-builder-project-tcn8.onrender.com/api";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://resume-builder-project-3h9o.vercel.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "workmailforaws123@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "12345678aA@";

const args = process.argv.slice(2);
const DURATION = parseInt(args[args.indexOf("--duration") + 1] || "120", 10);
const CONCURRENCY = parseInt(args[args.indexOf("--concurrency") + 1] || "2", 10);

let globalToken = null;
let globalUserId = null;
const createdEmails = new Set();

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body, token) {
  const url = `${BASE}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } catch (err) {
    return { status: 0, ok: false, data: null, error: err.message };
  }
}

const NAMES = [
  "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
  "Eva Martinez", "Frank Garcia", "Grace Lee", "Henry Wilson",
  "Ivy Anderson", "Jack Taylor", "Karen Thomas", "Leo Jackson",
  "Mia White", "Noah Harris", "Olivia Martin", "Peter Thompson",
];

const JOB_TITLES = [
  "Software Engineer", "Product Manager", "Data Scientist", "UX Designer",
  "DevOps Engineer", "Engineering Manager", "Full Stack Developer",
  "Marketing Director", "Sales Executive", "CTO", "VP of Engineering",
];

const COMPANY_NAMES = [
  "TechCorp", "DataFlow Inc", "CloudBase", "InnoSoft", "NexGen Systems",
  "Alpha Digital", "Beta Analytics", "Gamma Tech", "Delta Solutions",
  "Omega Innovations",
];

const RESUME_TEMPLATES = [
  "classic", "modern", "compact", "sidebar", "chronological", "functional",
  "executive", "scholarly", "research", "combination", "professional", "traditional",
];

const BULLETS = [
  "Led a team of 5 engineers to deliver a microservices architecture reducing deployment time by 60%",
  "Implemented CI/CD pipeline using GitHub Actions, cutting release cycle from 2 weeks to 2 days",
  "Designed and built RESTful APIs serving 10M+ requests/day with 99.9% uptime",
  "Optimized database queries reducing page load time from 3s to 200ms",
  "Mentored 3 junior developers through structured code reviews and pair programming sessions",
  "Architected migration from monolith to microservices serving 500k+ users",
  "Built real-time data pipeline processing 100k events/sec using Kafka and Spark",
  "Reduced infrastructure costs by 40% through Kubernetes resource optimization",
  "Developed A/B testing framework used by 4 product teams across 20+ experiments",
  "Created monitoring dashboards reducing Mean Time to Detection from 30min to 2min",
];

const SKILL_CATEGORIES = [
  { category: "Languages", items: ["TypeScript", "Python", "Go", "Rust", "Java"] },
  { category: "Frameworks", items: ["React", "Node.js", "Next.js", "Express", "Django"] },
  { category: "Cloud", items: ["AWS", "GCP", "Azure", "Docker", "Kubernetes"] },
  { category: "Databases", items: ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch"] },
  { category: "Tools", items: ["Git", "GitHub Actions", "Terraform", "Prometheus"] },
];

function makeResumePayload() {
  const name = pick(NAMES);
  const title = pick(JOB_TITLES);
  return {
    title: `${name}'s Resume`,
    templateId: pick(RESUME_TEMPLATES),
    personalInfo: {
      name,
      title,
      email: `user_${Date.now()}_${rand(100, 999)}@example.com`,
      phone: `+1${rand(200, 999)}${rand(100, 999)}${rand(1000, 9999)}`,
      location: `${pick(["San Francisco", "New York", "Austin", "Seattle", "Chicago"])}, ${pick(["CA", "NY", "TX", "WA", "IL"])}`,
      summary: pick([
        `Senior ${title} with ${rand(3, 12)}+ years of experience building scalable distributed systems. Passionate about developer experience and platform engineering.`,
        `Results-driven ${title} specializing in full-stack development and cloud-native architectures. Proven track record of delivering high-impact products.`,
        `Innovative ${title} with expertise in AI/ML integration and microservices design. Committed to writing clean, maintainable code and fostering engineering excellence.`,
      ]),
      linkedin: "https://linkedin.com/in/example",
      github: "https://github.com/example",
      portfolio: "https://example.com",
    },
    sections: {
      experience: [
        {
          role: title,
          company: pick(COMPANY_NAMES),
          location: pick(["Remote", "San Francisco, CA", "New York, NY"]),
          start: `${2020 - rand(0, 4)}-0${rand(1, 6)}`,
          end: rand(0, 1) ? "present" : `${2024}-0${rand(1, 6)}`,
          current: true,
          bullets: Array.from({ length: rand(3, 6) }, () => pick(BULLETS)),
          contentMode: "bullets",
        },
        {
          role: `Junior ${title}`,
          company: pick(COMPANY_NAMES),
          location: pick(["Remote", "San Francisco, CA"]),
          start: `${2016 - rand(0, 3)}-0${rand(1, 6)}`,
          end: `20${19 - rand(0, 1)}-0${rand(1, 6)}`,
          current: false,
          bullets: Array.from({ length: rand(2, 4) }, () => pick(BULLETS)),
          contentMode: "bullets",
        },
      ],
      education: [
        {
          institution: pick(["Stanford University", "MIT", "UC Berkeley", "Carnegie Mellon", "Georgia Tech"]),
          degree: pick(["B.S.", "M.S.", "Ph.D."]),
          field: pick(["Computer Science", "Software Engineering", "Data Science", "Information Systems"]),
          year: `${2014 + rand(0, 6)}`,
          cgpa: `${rand(3, 4)}.${rand(0, 9)}`,
        },
      ],
      skills: SKILL_CATEGORIES.map(sk => ({
        category: sk.category,
        items: Array.from({ length: rand(2, 4) }, () => pick(sk.items)),
      })),
      projects: [
        {
          name: pick(["Cloud Migration Platform", "Real-time Analytics Dashboard", "API Gateway Service",
            "ML Model Serving Platform", "Developer Productivity Tool"]),
          link: "https://github.com/example/project",
          technologies: ["TypeScript", "React", "Go", "Kubernetes", "PostgreSQL"],
          bullets: Array.from({ length: rand(2, 4) }, () => pick(BULLETS)),
          contentMode: "bullets",
        },
      ],
      certifications: [
        {
          name: pick(["AWS Solutions Architect", "Kubernetes Administrator", "Google Cloud Engineer",
            "Certified Kubernetes Developer", "HashiCorp Terraform Associate"]),
          issuer: pick(["Amazon", "Google", "CNCF", "HashiCorp", "Microsoft"]),
          year: `${2020 + rand(0, 4)}`,
        },
      ],
      languages: [],
    },
    sectionVisibility: {
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certifications: true,
      languages: false,
    },
    style: {
      accentColor: pick(["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"]),
      font: "inter",
      fontSize: "10pt",
      lineHeight: 1.5,
      pageMargin: "normal",
      sectionSpacing: "normal",
      showDividers: true,
      headerAlign: "left",
      bulletStyle: "•",
      backgroundColor: "#ffffff",
      textColor: "#1c1c1c",
      headingColor: "#111827",
      mutedColor: "#6B7280",
      borderColor: "#E5E7EB",
    },
  };
}

async function createUser(index) {
  const email = `loadtest_${Date.now()}_${index}@example.com`;
  if (createdEmails.has(email)) return null;
  createdEmails.add(email);
  const { status, data } = await api("POST", "/auth/signup", {
    name: pick(NAMES),
    email,
    password: "Test@123!",
  });
  return status === 201 || status === 200 ? data : null;
}

async function login(email, password) {
  const { data } = await api("POST", "/auth/login", { email, password });
  return data?.token || null;
}

async function generateTraffic(token, userId) {
  const tasks = [];

  // 1. Health & metrics endpoints (public)
  tasks.push(api("GET", "/health"));
  tasks.push(api("GET", "/health/uptime"));
  tasks.push(api("GET", "/health/metrics"));
  tasks.push(api("GET", "/templates"));

  // 2. Auth endpoints (authenticated)
  if (token) {
    tasks.push(api("GET", "/auth/me", null, token));
  }

  // 3. Resume operations (authenticated)
  if (token) {
    const resumePayload = makeResumePayload();
    const createRes = await api("POST", "/resumes", resumePayload, token);
    tasks.push(Promise.resolve(createRes));

    if (createRes.ok && createRes.data?.resume?._id) {
      const rid = createRes.data.resume._id;
      tasks.push(api("GET", `/resumes/${rid}`, null, token));
      tasks.push(api("GET", "/resumes", null, token));

      // AI operations
      if (rand(0, 1)) {
        tasks.push(api("POST", `/resumes/${rid}/analyze-ats`, {
          jobDescription: `We are looking for a ${pick(JOB_TITLES)} with experience in ${pick(["TypeScript", "Python", "Go", "React", "AWS"])}...`,
        }, token));
      }

      // Update resume
      if (rand(0, 1)) {
        tasks.push(api("PUT", `/resumes/${rid}`, { title: `Updated Resume ${Date.now()}` }, token));
      }

      // PDF export (may fail gracefully in dev)
      tasks.push(api("POST", `/resumes/${rid}/export`, { format: "pdf", preset: pick(["standard", "compact", "detailed"]) }, token));
    }

    // AI text improvement
    if (rand(0, 1)) {
      tasks.push(api("POST", "/ai/improve-text", {
        text: pick(["Led a team of engineers", "Built scalable microservices", "Reduced deployment time"]),
        context: pick(["resume", "cover-letter"]),
        tone: pick(["professional", "confident", "concise"]),
      }, token));
      // May fail without real AI key — that's fine, it generates error metrics
    }
  }

  // 4. Frontend metrics (public)
  tasks.push(api("POST", "/client-metrics", {
    metrics: Array.from({ length: rand(3, 8) }, () => ({
      name: pick(["LCP", "FID", "CLS", "spa_navigation", "heapUsed", "api_resume_load"]),
      value: rand(10, 5000),
      unit: pick(["ms", "score", "bytes"]),
      context: { type: pick(["web-vital", "navigation", "memory", "api"]) },
    })),
  }));

  // 5. Frontend errors (public)
  if (rand(0, 3) === 0) {
    tasks.push(api("POST", "/client-error", {
      message: pick(["TypeError: Cannot read property of null", "NetworkError: Failed to fetch",
        "ReferenceError: x is not defined", "SyntaxError: Unexpected token"]),
      source: pick(["react-boundary", "window-error", "unhandled-rejection"]),
      url: `${FRONTEND_URL}/${pick(["builder", "resumes", "templates", "dashboard"])}`,
      userAgent: "Mozilla/5.0 LoadTest/1.0",
    }));
  }

  // 6. Logs (public)
  tasks.push(api("POST", "/logs/ingest", {
    logs: Array.from({ length: rand(1, 3) }, () => ({
      timestamp: new Date().toISOString(),
      level: rand(0, 3),
      message: pick(["Page loaded", "API request completed", "User action: clicked button", "Navigation to /builder"]),
      context: { source: "frontend" },
    })),
  }));

  // 7. Admin routes (if token is admin)
  if (token) {
    tasks.push(api("GET", "/admin/observability/overview", null, token));
    tasks.push(api("GET", "/admin/observability/system", null, token));
    tasks.push(api("GET", "/admin/observability/ai", null, token));
    tasks.push(api("GET", "/admin/observability/errors", null, token));
    tasks.push(api("GET", "/admin/analytics/dashboard", null, token));
    tasks.push(api("GET", "/admin/analytics/templates", null, token));
  }

  await Promise.allSettled(tasks);
}

async function loginAsAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.log("  ADMIN_EMAIL/PASS not set — skipping admin routes");
    return null;
  }
  const token = await login(ADMIN_EMAIL, ADMIN_PASS);
  if (token) {
    globalToken = token;
    console.log("  Logged in as admin");
  }
  return token;
}

async function main() {
  console.log(`\n========================================`);
  console.log(`  Grafana Data Generator`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Duration: ${DURATION}s, Concurrency: ${CONCURRENCY}`);
  console.log(`========================================\n`);

  const startTime = Date.now();
  let cycles = 0;
  let errors = 0;

  // Login as admin once
  let adminToken = await loginAsAdmin();

  // Create users and get tokens
  const sessions = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const user = await createUser(i);
    if (user) {
      const email = `loadtest_${Date.now()}_${i}@example.com`;
      const token = await login(email, "Test@123!");
      if (token) sessions.push({ token, userId: user.id });
    }
  }

  if (sessions.length === 0 && !adminToken) {
    console.log("  No user sessions available. Trying admin login for unauthenticated routes only.\n");
  }

  while (Date.now() - startTime < DURATION * 1000) {
    const batch = [];

    // Admin traffic
    if (adminToken) {
      batch.push(generateTraffic(adminToken, "admin"));
    }

    // User traffic
    for (const session of sessions) {
      batch.push(generateTraffic(session.token, session.userId));
    }

    // Also send some requests without auth (public endpoints)
    batch.push(generateTraffic(null, null));

    const results = await Promise.allSettled(batch);
    for (const r of results) {
      if (r.status === "rejected") errors++;
    }
    cycles++;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = DURATION - elapsed;
    process.stdout.write(`\r  Cycle ${cycles} | ${elapsed}s elapsed | ${remaining}s remaining | Errors: ${errors}  `);

    await sleep(rand(1000, 3000));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n  Done! ${cycles} cycles in ${totalTime}s`);
  console.log(`  Check your Grafana dashboard for data.\n`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
