import {
  ResumeDocument,
  defaultSectionOrder,
  defaultSectionVisibility,
  defaultStyle,
} from "@/types/resume-types";


// ─── Sample Data ──────────────────────────────────────────────────────────────
export const sampleData: ResumeDocument = {
  title: "Sample Resume",
  templateId: "classic",
  personalInfo: {
    name: "Alexandra Chen",
    title: "Senior Software Engineer",
    email: "alex.chen@email.com",
    phone: "+1 (415) 555-0182",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexchen",
    portfolio: "alexchen.dev",
    summary:
      "Senior Software Engineer with 7+ years building scalable distributed systems and leading cross-functional teams. Proven track record of reducing infrastructure costs by 40% and shipping products used by 2M+ users.",
  },
  sections: {
    experience: [
      {
        id: "exp-1",
        company: "Stripe",
        role: "Senior Software Engineer",
        start: "Mar 2021",
        end: "",
        location: "San Francisco, CA",
        current: true,
        bullets: [
          "Architected real-time fraud detection pipeline processing 500K transactions/sec using Kafka and Flink, reducing chargebacks by 32%.",
          "Led migration of monolithic payments service to microservices, cutting deployment time from 4h to 12min.",
          "Mentored 4 junior engineers; 3 promoted to mid-level within 18 months.",
        ],
      },
      {
        id: "exp-2",
        company: "Airbnb",
        role: "Software Engineer II",
        start: "Jun 2018",
        end: "Feb 2021",
        location: "San Francisco, CA",
        current: false,
        bullets: [
          "Built dynamic pricing engine serving 6M+ listings across 220 countries using ML models integrated into Go microservices.",
          "Reduced API latency by 60% through caching layer redesign and database query optimization.",
          "Owned end-to-end delivery of host onboarding feature, increasing host sign-ups by 18%.",
        ],
      },
      {
        id: "exp-3",
        company: "Palantir Technologies",
        role: "Software Engineer",
        start: "Aug 2016",
        end: "May 2018",
        location: "New York, NY",
        current: false,
        bullets: [
          "Developed data ingestion pipelines for government clients processing 10TB+ daily using Spark and HDFS.",
          "Built internal tooling that reduced analyst workflow time by 45% across 3 enterprise contracts.",
        ],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "University of California, Berkeley",
        degree: "B.S.",
        field: "Electrical Engineering & Computer Science",
        year: "2016",
        cgpa: "3.9",
      },
    ],
    skills: [
      { id: "skills-1", category: "Languages", items: ["Go", "TypeScript", "Python", "Java", "Rust"] },
      { id: "skills-2", category: "Infrastructure", items: ["Kubernetes", "AWS", "Terraform", "Kafka", "Redis"] },
      { id: "skills-3", category: "Databases", items: ["PostgreSQL", "DynamoDB", "Cassandra", "Elasticsearch"] },
    ],
    projects: [
      {
        id: "proj-1",
        name: "OpenDistribute",
        description: "Open-source distributed task queue with 2.4K GitHub stars, supporting 10+ pluggable backends.",
        tech: "Go, Redis, gRPC",
        link: "",
      },
      {
        id: "proj-2",
        name: "BudgetOS",
        description: "Personal finance dashboard with bank sync, ML-based categorization, and forecasting.",
        tech: "Next.js, Python, Plaid API",
        link: "",
      },
    ],
    certifications: [
      { id: "cert-1", name: "AWS Certified Solutions Architect - Professional", issuer: "AWS", year: "2023" },
      { id: "cert-2", name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", year: "2022" },
    ],
    languages: [],
  },
  style: { ...defaultStyle },
  sectionOrder: [...defaultSectionOrder],
  sectionVisibility: { ...defaultSectionVisibility },
};
 
