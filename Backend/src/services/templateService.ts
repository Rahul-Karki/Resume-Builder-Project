import Template, { ITemplate } from "../models/Template.model";
import TemplateUsage from "../models/TemplateUsage.model";
import mongoose from "mongoose";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTemplateDto {
  layoutId:    string;
  name:        string;
  description: string;
  category:    ITemplate["category"];
  tag:         string;
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
  totalTemplates:     number;
  publishedTemplates: number;
  draftTemplates:     number;
  premiumTemplates:   number;
  totalUsesThisWeek:  number;
  totalUsesThisMonth: number;
  mostUsed:  TemplateAnalytics | null;
  leastUsed: TemplateAnalytics | null;
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

  // GET all templates (admin sees all statuses)
  static async getAll(filter: { status?: string; category?: string } = {}): Promise<ITemplate[]> {
    const query: Record<string, string> = {};
    if (filter.status)   query.status   = filter.status;
    if (filter.category) query.category = filter.category;
    return Template.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();
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
    const template = new Template({
      ...dto,
      createdBy: adminId,
      updatedBy: adminId,
    });
    return template.save();
  }

  // UPDATE (partial)
  static async update(id: string, dto: UpdateTemplateDto, adminId: string): Promise<ITemplate | null> {
    return Template.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: adminId, ...(dto.status === "published" ? { publishedAt: new Date() } : {}) },
      { new: true, runValidators: true }
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
    return Template.findByIdAndUpdate(id, update, { new: true }).lean();
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

  // Aggregate analytics for ALL templates
  static async getAllAnalytics(days: number = 30): Promise<TemplateAnalytics[]> {
    const { start, end } = dateRange(days);
    const weekStart = dateRange(7).start;
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() - 1);

    const templates = await Template.find().lean();

    const analytics: TemplateAnalytics[] = await Promise.all(
      templates.map(async (tpl) => {
        const id = String(tpl._id);

        // Monthly data
        const monthlyRows = await TemplateUsage.find({
          templateId: id,
          date: { $gte: start, $lte: end },
        }).sort({ date: 1 }).lean();

        // Weekly data (last 7d)
        const weeklyRows = monthlyRows.filter(r => r.date >= weekStart);

        // Prev-week data for trend
        const prevWeekRows = await TemplateUsage.find({
          templateId: id,
          date: { $gte: prevWeekStart, $lte: prevWeekEnd },
        }).lean();

        const monthlyUses = monthlyRows.reduce((s, r) => s + r.count, 0);
        const weeklyUses  = weeklyRows.reduce((s, r) => s + r.count, 0);
        const prevWeekUses = prevWeekRows.reduce((s, r) => s + r.count, 0);

        const trend: "up" | "down" | "stable" =
          weeklyUses > prevWeekUses + 2 ? "up" :
          weeklyUses < prevWeekUses - 2 ? "down" : "stable";

        const daily: DailyUsage[] = monthlyRows.map(r => ({
          date:           r.date.toISOString().slice(0, 10),
          count:          r.count,
          resumesCreated: r.resumesCreated,
          resumesEdited:  r.resumesEdited,
        }));

        return {
          templateId: id,
          layoutId:   tpl.layoutId,
          name:       tpl.name,
          status:     tpl.status,
          totalUses:  monthlyUses + weeklyUses, // rough lifetime proxy
          weeklyUses,
          monthlyUses,
          daily,
          trend,
        };
      })
    );

    return analytics.sort((a, b) => b.monthlyUses - a.monthlyUses);
  }

  // Dashboard summary stats
  static async getDashboardStats(): Promise<DashboardStats> {
    const [totalTemplates, publishedTemplates, draftTemplates, premiumTemplates] =
      await Promise.all([
        Template.countDocuments(),
        Template.countDocuments({ status: "published" }),
        Template.countDocuments({ status: "draft" }),
        Template.countDocuments({ isPremium: true }),
      ]);

    const { start: weekStart } = dateRange(7);
    const { start: monthStart } = dateRange(30);

    const [weeklyAgg, monthlyAgg] = await Promise.all([
      TemplateUsage.aggregate([
        { $match: { date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
      TemplateUsage.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
    ]);

    const analytics = await TemplateService.getAllAnalytics(30);
    const published  = analytics.filter(a => a.status === "published");

    return {
      totalTemplates,
      publishedTemplates,
      draftTemplates,
      premiumTemplates,
      totalUsesThisWeek:  weeklyAgg[0]?.total  ?? 0,
      totalUsesThisMonth: monthlyAgg[0]?.total ?? 0,
      mostUsed:  published[0] ?? null,
      leastUsed: published.length > 0 ? published[published.length - 1] : null,
    };
  }
}