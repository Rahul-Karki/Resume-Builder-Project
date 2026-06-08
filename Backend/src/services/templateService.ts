import Template, { ITemplate } from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import User from "../models/User";
import Resume from "../models/Resume";
import mongoose from "mongoose";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTemplateDto {
  layoutId:    string;
  name:        string;
  description: string;
  category:    ITemplate["category"];
  audience:    ITemplate["audience"];
  tag:         string;
  tags?:       string[];
  isPremium:   boolean;
  sortOrder:   number;
  cssVars:     Partial<ITemplate["cssVars"]>;
  slots:       Partial<ITemplate["slots"]>;
  thumbnailUrl?: string;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  status?: ITemplate["status"];
}

export interface UsageWindow {
  start: Date;
  end:   Date;
  days:  number;
}

export interface DailyUsage {
  date:           string;  // YYYY-MM-DD
  count:          number;
  resumesCreated: number;
  resumesEdited:  number;
}

export interface TemplateAnalytics {
  templateId:   string;
  layoutId:     string;
  name:         string;
  status:       string;
  totalUses:    number;
  weeklyUses:   number;
  monthlyUses:  number;
  daily:        DailyUsage[];
  trend:        "up" | "down" | "stable";  // compares last 7d vs prev 7d
}

export interface DashboardStats {
  totalUsers:         number;
  totalTemplates:     number;
  totalResumes:       number;
  publishedTemplates: number;
  draftTemplates:     number;
  premiumTemplates:   number;
  totalUsesThisWeek:  number;
  totalUsesThisMonth: number;
  mostUsed:  TemplateAnalytics | null;
  leastUsed: TemplateAnalytics | null;
  userSignups:        DailyUsage[];
}

// ─── Helper: day bucket ────────────────────────────────────────────────────────

function dayBucket(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateRange(daysBack: number): { start: Date; end: Date } {
  const end   = dayBucket(new Date());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBack + 1);
  return { start, end };
}

// ─── Template CRUD ─────────────────────────────────────────────────────────────

export class TemplateService {
  private static normalizeCategory(value?: string, fallback?: ITemplate["category"]): ITemplate["category"] | undefined {
    if (value === "tech" || value === "non-tech") {
      return value;
    }

    return fallback;
  }

  private static normalizeTags(tag?: string, tags?: string[]) {
    const combined = [tag, ...(tags ?? [])]
      .flatMap((entry) => String(entry ?? "").split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);

    return Array.from(new Set(combined)).slice(0, 12);
  }

  // GET all templates (admin sees all statuses) with pagination
  static async getAll(
    filter: { status?: string; category?: string; audience?: string } = {},
    page = 1,
    limit = 50
  ): Promise<{ templates: ITemplate[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, string> = {};
    if (filter.status)   query.status   = filter.status;
    const category = this.normalizeCategory(filter.category);
    const audience = this.normalizeCategory(filter.audience);
    if (category) query.category = category;
    if (audience) query.audience = audience;
    const skip = (page - 1) * limit;
    const [templates, total] = await Promise.all([
      Template.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Template.countDocuments(query),
    ]);
    return { templates, total, page, totalPages: Math.ceil(total / limit) };
  }

  // GET single template
  static async getById(id: string): Promise<ITemplate | null> {
    return Template.findById(id).lean();
  }

  // CREATE
  static async create(dto: CreateTemplateDto, adminId: string): Promise<ITemplate> {
    const existing = await Template.findOne({ layoutId: dto.layoutId });
    if (existing) {
      throw new Error(`layoutId "${dto.layoutId}" is already in use.`);
    }
    const category = this.normalizeCategory(dto.category, dto.audience ?? "non-tech") ?? "non-tech";
    const template = new Template({
      ...dto,
      category,
      audience: category,
      tags: this.normalizeTags(dto.tag, dto.tags),
      createdBy: adminId,
      updatedBy: adminId,
    });
    return template.save();
  }

  // UPDATE (partial)
  static async update(id: string, dto: UpdateTemplateDto, adminId: string): Promise<ITemplate | null> {
    const categorySource = dto.category ?? dto.audience;
    const category = categorySource ? this.normalizeCategory(categorySource) : undefined;
    const tags = dto.tag || dto.tags ? this.normalizeTags(dto.tag, dto.tags) : undefined;
    return Template.findByIdAndUpdate(
      id,
      {
        ...dto,
        ...(category ? { category, audience: category } : {}),
        ...(tags ? { tags } : {}),
        updatedBy: adminId,
        ...(dto.status === "published" ? { publishedAt: new Date() } : {}),
      },
      { returnDocument: "after", runValidators: true }
    ).lean();
  }

  // CHANGE STATUS (publish / unpublish / archive)
  static async setStatus(
    id: string,
    status: ITemplate["status"],
    adminId: string
  ): Promise<ITemplate | null> {
    const update: Record<string, unknown> = { status, updatedBy: adminId };
    if (status === "published") update.publishedAt = new Date();
    return Template.findByIdAndUpdate(id, update, { returnDocument: "after" }).lean();
  }

  // TOGGLE PREMIUM
  static async togglePremium(id: string, adminId: string): Promise<ITemplate | null> {
    const tpl = await Template.findById(id);
    if (!tpl) return null;
    tpl.isPremium = !tpl.isPremium;
    tpl.updatedBy = new mongoose.Types.ObjectId(adminId);
    return tpl.save();
  }

  // DELETE (hard delete — use archive instead in production)
  static async delete(id: string): Promise<boolean> {
    const result = await Template.findByIdAndDelete(id);
    return !!result;
  }

  // REORDER
  static async reorder(orderedIds: string[], adminId: string): Promise<void> {
    const ops = orderedIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id },
        update: { sortOrder: idx, updatedBy: adminId },
      },
    }));
    await Template.bulkWrite(ops);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  // Get usage for a single template over N days
  static async getTemplateUsage(templateId: string, days: number): Promise<DailyUsage[]> {
    const { start, end } = dateRange(days);
    const rows = await TemplateUsage.find({
      templateId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 }).lean();

    return rows.map(r => ({
      date:           r.date.toISOString().slice(0, 10),
      count:          r.count,
      resumesCreated: r.resumesCreated,
      resumesEdited:  r.resumesEdited,
    }));
  }

  // Aggregate analytics for ALL templates using a single aggregation pipeline
  static async getAllAnalytics(days: number = 30): Promise<TemplateAnalytics[]> {
    const { start, end } = dateRange(days);
    const weekStart = dateRange(7).start;
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() - 1);

    const templates = await Template.find().lean();
    if (templates.length === 0) return [];

    const templateObjectIds = templates.map((t) => new mongoose.Types.ObjectId(t._id));

    // Single aggregation: group by templateId with separate sums for monthly/weekly/prev-week
    const usageAgg = await TemplateUsage.aggregate([
      { $match: { templateId: { $in: templateObjectIds }, date: { $gte: prevWeekStart, $lte: end } } },
      {
        $facet: {
          monthly: [
            { $match: { date: { $gte: start } } },
            {
              $group: {
                _id: "$templateId",
                totalUses: { $sum: "$count" },
                dailyRows: {
                  $push: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    count: "$count",
                    resumesCreated: "$resumesCreated",
                    resumesEdited: "$resumesEdited",
                  },
                },
              },
            },
          ],
          weekly: [
            { $match: { date: { $gte: weekStart } } },
            { $group: { _id: "$templateId", total: { $sum: "$count" } } },
          ],
          prevWeek: [
            { $match: { date: { $gte: prevWeekStart, $lte: prevWeekEnd } } },
            { $group: { _id: "$templateId", total: { $sum: "$count" } } },
          ],
        },
      },
    ]);

    interface MonthlyRow { _id: string; totalUses: number; dailyRows: DailyUsage[]; }
    interface WeeklyRow { _id: string; total: number; }

    const monthlyMap = new Map<string, MonthlyRow>(
      (usageAgg[0]?.monthly ?? []).map((r: any) => [r._id, r as MonthlyRow])
    );
    const weeklyMap = new Map<string, number>(
      (usageAgg[0]?.weekly ?? []).map((r: any) => [r._id, (r as WeeklyRow).total])
    );
    const prevWeekMap = new Map<string, number>(
      (usageAgg[0]?.prevWeek ?? []).map((r: any) => [r._id, (r as WeeklyRow).total])
    );

    const analytics: TemplateAnalytics[] = templates.map((tpl) => {
      const id = String(tpl._id);
      const monthly = monthlyMap.get(id);
      const monthlyUses = monthly?.totalUses ?? 0;
      const weeklyUses = weeklyMap.get(id) ?? 0;
      const prevWeekUses = prevWeekMap.get(id) ?? 0;

      const trend: "up" | "down" | "stable" =
        weeklyUses > prevWeekUses + 2 ? "up" :
        weeklyUses < prevWeekUses - 2 ? "down" : "stable";

      return {
        templateId: id,
        layoutId:   tpl.layoutId,
        name:       tpl.name,
        status:     tpl.status,
        totalUses:  monthlyUses,
        weeklyUses,
        monthlyUses,
        daily: monthly?.dailyRows ?? [],
        trend,
      };
    });

    return analytics.sort((a, b) => b.monthlyUses - a.monthlyUses);
  }

  // Dashboard summary stats — single aggregation for usage, template counts via Promise.all
  static async getDashboardStats(): Promise<DashboardStats> {
    const { start, end } = dateRange(30);

    const [templateCounts, totalUsers, totalResumes, analytics, userSignupsAgg] = await Promise.all([
      Template.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
            draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
            premium: { $sum: { $cond: ["$isPremium", 1, 0] } },
          },
        },
      ]),
      User.countDocuments(),
      Resume.countDocuments(),
      TemplateService.getAllAnalytics(30),
      User.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const dayMap: Record<string, DailyUsage> = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      dayMap[key] = { date: key, count: 0, resumesCreated: 0, resumesEdited: 0 };
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const row of userSignupsAgg) {
      if (dayMap[row._id]) {
        dayMap[row._id].count = row.count;
      }
    }

    const counts = templateCounts[0] ?? { total: 0, published: 0, draft: 0, premium: 0 };
    const published = analytics.filter(a => a.status === "published");
    const totalUsesThisWeek = analytics.reduce((s, a) => s + a.weeklyUses, 0);
    const totalUsesThisMonth = analytics.reduce((s, a) => s + a.monthlyUses, 0);

    return {
      totalUsers,
      totalResumes,
      totalTemplates:     counts.total,
      publishedTemplates: counts.published,
      draftTemplates:     counts.draft,
      premiumTemplates:   counts.premium,
      totalUsesThisWeek,
      totalUsesThisMonth,
      mostUsed:  published[0] ?? null,
      leastUsed: published.length > 0 ? published[published.length - 1] : null,
      userSignups: Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
