// ─── admin.types.ts ───────────────────────────────────────────────────────────

export type TemplateStatus   = "draft" | "published" | "archived";
export type TemplateCategory = "professional" | "corporate" | "technical" | "creative" | "academic";
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
  date:           string;   // YYYY-MM-DD
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
  totalTemplates:     number;
  publishedTemplates: number;
  draftTemplates:     number;
  premiumTemplates:   number;
  totalUsesThisWeek:  number;
  totalUsesThisMonth: number;
  mostUsed:           TemplateAnalytics | null;
  leastUsed:          TemplateAnalytics | null;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface TemplateFormData {
  layoutId:    string;
  name:        string;
  description: string;
  category:    TemplateCategory;
  audience:    TemplateAudience;
  tag:         string;
  isPremium:   boolean;
  sortOrder:   number;
  cssVars:     CssVars;
  slots:       Slots;
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
  category:    "professional",
  audience:    "non-tech",
  tag:         "",
  isPremium:   false,
  sortOrder:   0,
  cssVars:     { ...DEFAULT_CSS_VARS },
  slots:       { ...DEFAULT_SLOTS },
};

export const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "corporate",    label: "Corporate"    },
  { value: "technical",    label: "Technical"    },
  { value: "creative",     label: "Creative"     },
  { value: "academic",     label: "Academic"     },
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

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

export type AdminPage = "dashboard" | "templates";

export interface NavItem {
  id:    AdminPage;
  label: string;
  icon:  string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",  icon: "◈" },
  { id: "templates",  label: "Templates",  icon: "◉" },
];
