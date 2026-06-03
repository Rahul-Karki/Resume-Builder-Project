export type TemplateStatus   = "draft" | "published" | "archived";
export type TemplateCategory = "tech" | "non-tech";
export type TemplateAudience = "tech" | "non-tech";

export interface CssVars {
  accentColor:     string;
  headingColor:    string;
  textColor:       string;
  mutedColor:      string;
  borderColor:     string;
  backgroundColor: string;
  bodyFont:        string;
  headingFont:     string;
  fontSize:        string;
  lineHeight:      string;
  pageMargin:      string;
  sectionSpacing:  string;
  showDividers:    string;
  bulletStyle:     string;
  headerAlign:     string;
}

export interface Slots {
  summary:        boolean;
  experience:     boolean;
  education:      boolean;
  skills:         boolean;
  projects:       boolean;
  certifications: boolean;
  languages:      boolean;
}

export interface AdminTemplate {
  _id:         string;
  layoutId:    string;
  name:        string;
  description: string;
  category:    TemplateCategory;
  audience:    TemplateAudience;
  tag:         string;
  tags?:       string[];
  thumbnailUrl: string;
  status:      TemplateStatus;
  isPremium:   boolean;
  sortOrder:   number;
  cssVars:     CssVars;
  slots:       Slots;
  createdAt:   string;
  updatedAt:   string;
  publishedAt: string | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailyUsage {
  date:           string;
  count:          number;
  resumesCreated: number;
  resumesEdited:  number;
}

export type Trend = "up" | "down" | "stable";

export interface TemplateAnalytics {
  templateId:  string;
  layoutId:    string;
  name:        string;
  status:      string;
  totalUses:   number;
  weeklyUses:  number;
  monthlyUses: number;
  daily:       DailyUsage[];
  trend:       Trend;
}

export interface DashboardStats {
  totalUsers:         number;
  totalTemplates:     number;
  publishedTemplates: number;
  draftTemplates:     number;
  premiumTemplates:   number;
  totalUsesThisWeek:  number;
  totalUsesThisMonth: number;
  mostUsed:           TemplateAnalytics | null;
  leastUsed:          TemplateAnalytics | null;
}

// ─── Observability Types ──────────────────────────────────────────────────────

export interface MetricsSnapshot {
  requestsPerMinute: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  activeConnections: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  cacheHitRatio: number;
  dbQueryTimeMs: number;
  totalUsers: number;
  totalResumes: number;
  activeSessions: number;
}

export interface AIMetricsSnapshot {
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  totalTokens: number;
  estimatedCost: number;
  fallbackRate: number;
  providerLatency: Record<string, number>;
  failuresByType: Record<string, number>;
  recentErrors: { provider: string; errorCategory: string; count: number }[];
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  latency: number;
  lastChecked: string;
  message?: string;
}

export interface SystemHealth {
  redis: HealthStatus;
  mongodb: HealthStatus;
  api: HealthStatus;
  queue: HealthStatus;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  authFailures: number;
  rateLimitHits: number;
  recentErrors: { timestamp: string; type: string; route: string; count: number }[];
}

export interface ObservabilityOverview {
  metrics: MetricsSnapshot;
  aiMetrics: AIMetricsSnapshot;
  systemHealth: SystemHealth;
  errorMetrics: ErrorMetrics;
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

export type AdminPage = "dashboard" | "templates";

export interface NavItem {
  id:    AdminPage;
  label: string;
  icon:  string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",  icon: "◈" },
  { id: "templates",  label: "Templates",  icon: "◇" },
];

export const PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: "Dashboard",
  templates: "Templates",
};

export const PAGE_SUBTITLES: Record<AdminPage, string> = {
  dashboard: "Usage analytics and performance overview",
  templates: "Create, publish, and configure resume templates",
};

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface TemplateFormData {
  layoutId:    string;
  name:        string;
  description: string;
  category:    TemplateCategory;
  audience:    TemplateAudience;
  tag:         string;
  tags:        string[];
  isPremium:   boolean;
  sortOrder:   number;
  cssVars:     CssVars;
  slots:       Slots;
  thumbnailUrl?: string;
}

export const DEFAULT_CSS_VARS: CssVars = {
  accentColor:     "#1a1a1a",
  headingColor:    "#111111",
  textColor:       "#333333",
  mutedColor:      "#666666",
  borderColor:     "#cccccc",
  backgroundColor: "#ffffff",
  bodyFont:        "EB Garamond, serif",
  headingFont:     "EB Garamond, serif",
  fontSize:        "10.5pt",
  lineHeight:      "1.5",
  pageMargin:      "normal",
  sectionSpacing:  "normal",
  showDividers:    "true",
  bulletStyle:     "•",
  headerAlign:     "left",
};

export const DEFAULT_SLOTS: Slots = {
  summary:        true,
  experience:     true,
  education:      true,
  skills:         true,
  projects:       false,
  certifications: false,
  languages:      false,
};

export const DEFAULT_FORM: TemplateFormData = {
  layoutId:    "",
  name:        "",
  description: "",
  category:    "non-tech",
  audience:    "non-tech",
  tag:         "",
  tags:        [],
  isPremium:   false,
  sortOrder:   0,
  cssVars:     { ...DEFAULT_CSS_VARS },
  slots:       { ...DEFAULT_SLOTS },
};

export const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "non-tech", label: "Non-Tech" },
  { value: "tech", label: "Tech" },
];

export const AUDIENCE_OPTIONS: { value: TemplateAudience; label: string }[] = [
  { value: "non-tech", label: "Non-Tech" },
  { value: "tech", label: "Tech" },
];

export const FONT_OPTIONS = [
  "EB Garamond, serif",
  "Playfair Display, serif",
  "Lora, serif",
  "Source Serif 4, serif",
  "DM Sans, sans-serif",
  "IBM Plex Sans, sans-serif",
  "Nunito Sans, sans-serif",
  "Outfit, sans-serif",
];

export const REGISTERED_LAYOUT_IDS = [
  "classic", "executive", "modern", "compact", "sidebar",
  "scholarly", "research",
  "chronological", "functional", "combination",
  "traditional-assistant", "community-impact",
  "minimal", "timeline", "creative-v2",
];
