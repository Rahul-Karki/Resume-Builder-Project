import { ResumeDocument } from "@/types/resume-types";
import { ClassicTemplate } from "@/components/templates/ClassicTemplate";
import { ExecutiveTemplate } from "@/components/templates/ExecutiveTemplate";
import { ModernTemplate } from "@/components/templates/ModernTemplate";
import { CompactTemplate } from "@/components/templates/CompactTemplate";

import { SidebarTemplate } from "@/components/templates/SidebarTemplate";

// ─── Template Map ─────────────────────────────────────────────────────────────
export const templateComponents: Record<string, React.FC<{ data: ResumeDocument }>> = {
  classic:   ClassicTemplate,
  executive: ExecutiveTemplate,
  modern:    ModernTemplate,
  compact:   CompactTemplate,
  sidebar:   SidebarTemplate,
};