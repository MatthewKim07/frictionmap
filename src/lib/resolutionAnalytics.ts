import { calculateMonthlyCost, calculateMonthlyHours } from "@/lib/frictionCalculations";
import type { FrictionReport } from "@/types";

export interface ResolutionAnalyticsOptions {
  hourlyRate: number;
}

export function getResolvedReports(reports: FrictionReport[]): FrictionReport[] {
  return reports.filter((r) => r.status === "resolved");
}

export function getUnresolvedReports(reports: FrictionReport[]): FrictionReport[] {
  return reports.filter((r) => r.status !== "resolved");
}

/** Calendar day used for bucketing resolved impact (UTC date key YYYY-MM-DD). */
export function resolutionDateKeyForReport(r: FrictionReport): string | null {
  if (r.status !== "resolved") return null;
  const raw = r.resolvedAt ?? r.updatedAt ?? r.createdAt;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export interface ResolutionDayBucket {
  dateKey: string;
  resolvedCount: number;
  hoursSaved: number;
  costSaved: number;
  reports: FrictionReport[];
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Per-calendar-day totals for resolved reports in [start, end] inclusive (UTC days). */
export function getResolutionActivityByDay(
  reports: FrictionReport[],
  options: ResolutionAnalyticsOptions & { startDate: Date; endDate: Date },
): ResolutionDayBucket[] {
  const { hourlyRate, startDate, endDate } = options;
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const map = new Map<string, ResolutionDayBucket>();

  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
    const key = dateKeyUtc(d);
    map.set(key, { dateKey: key, resolvedCount: 0, hoursSaved: 0, costSaved: 0, reports: [] });
  }

  for (const r of getResolvedReports(reports)) {
    const key = resolutionDateKeyForReport(r);
    if (!key || !map.has(key)) continue;
    const h = calculateMonthlyHours(r);
    const c = Math.round(calculateMonthlyCost(r, hourlyRate));
    const b = map.get(key)!;
    b.resolvedCount += 1;
    b.hoursSaved += h;
    b.costSaved += c;
    b.reports.push(r);
  }

  return [...map.keys()].sort().map((k) => map.get(k)!);
}

export interface ResolutionWeekBucket {
  weekStart: string;
  resolvedCount: number;
  hoursSaved: number;
  costSaved: number;
  reports: FrictionReport[];
}

/** Monday UTC week start key YYYY-MM-DD. */
export function startOfWeekMondayUtc(d: Date): Date {
  const c = startOfUtcDay(d);
  const day = c.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(c, diff);
}

export function getResolutionActivityByWeek(
  reports: FrictionReport[],
  options: ResolutionAnalyticsOptions & { startDate: Date; endDate: Date },
): ResolutionWeekBucket[] {
  const { hourlyRate, startDate, endDate } = options;
  const start = startOfWeekMondayUtc(startDate);
  const end = startOfWeekMondayUtc(endDate);
  const map = new Map<string, ResolutionWeekBucket>();

  for (let w = new Date(start); w.getTime() <= end.getTime(); w = addUtcDays(w, 7)) {
    const key = dateKeyUtc(w);
    map.set(key, { weekStart: key, resolvedCount: 0, hoursSaved: 0, costSaved: 0, reports: [] });
  }

  for (const r of getResolvedReports(reports)) {
    const dk = resolutionDateKeyForReport(r);
    if (!dk) continue;
    const rd = startOfUtcDay(new Date(`${dk}T12:00:00.000Z`));
    const wk = dateKeyUtc(startOfWeekMondayUtc(rd));
    if (!map.has(wk)) continue;
    const h = calculateMonthlyHours(r);
    const c = Math.round(calculateMonthlyCost(r, hourlyRate));
    const b = map.get(wk)!;
    b.resolvedCount += 1;
    b.hoursSaved += h;
    b.costSaved += c;
    b.reports.push(r);
  }

  return [...map.keys()].sort().map((k) => map.get(k)!);
}

export interface ResolutionSummary {
  totalResolvedReports: number;
  totalResolvedMonthlyHours: number;
  totalResolvedMonthlyCost: number;
  totalResolvedAnnualizedCost: number;
  unresolvedMonthlyHours: number;
  unresolvedMonthlyCost: number;
  totalReports: number;
  totalMonthlyHoursAll: number;
  totalMonthlyCostAll: number;
  percentCostAddressed: number;
  percentReportsAddressed: number;
}

export function getResolutionSummary(reports: FrictionReport[], hourlyRate: number): ResolutionSummary {
  const resolved = getResolvedReports(reports);
  const unresolved = getUnresolvedReports(reports);

  let totalResolvedMonthlyHours = 0;
  let totalResolvedMonthlyCost = 0;
  for (const r of resolved) {
    totalResolvedMonthlyHours += calculateMonthlyHours(r);
    totalResolvedMonthlyCost += Math.round(calculateMonthlyCost(r, hourlyRate));
  }

  let unresolvedMonthlyHours = 0;
  let unresolvedMonthlyCost = 0;
  for (const r of unresolved) {
    unresolvedMonthlyHours += calculateMonthlyHours(r);
    unresolvedMonthlyCost += Math.round(calculateMonthlyCost(r, hourlyRate));
  }

  const totalMonthlyHoursAll = totalResolvedMonthlyHours + unresolvedMonthlyHours;
  const totalMonthlyCostAll = totalResolvedMonthlyCost + unresolvedMonthlyCost;
  const totalReports = reports.length;

  const percentCostAddressed =
    totalMonthlyCostAll > 0 ? Math.min(100, Math.round((totalResolvedMonthlyCost / totalMonthlyCostAll) * 100)) : 0;
  const percentReportsAddressed =
    totalReports > 0 ? Math.min(100, Math.round((resolved.length / totalReports) * 100)) : 0;

  return {
    totalResolvedReports: resolved.length,
    totalResolvedMonthlyHours,
    totalResolvedMonthlyCost,
    totalResolvedAnnualizedCost: totalResolvedMonthlyCost * 12,
    unresolvedMonthlyHours,
    unresolvedMonthlyCost,
    totalReports,
    totalMonthlyHoursAll,
    totalMonthlyCostAll,
    percentCostAddressed,
    percentReportsAddressed,
  };
}

export function getRecentResolvedReports(reports: FrictionReport[], limit: number): FrictionReport[] {
  const resolved = getResolvedReports(reports);
  return [...resolved].sort((a, b) => {
    const ta = new Date(a.resolvedAt ?? a.updatedAt ?? a.createdAt).getTime();
    const tb = new Date(b.resolvedAt ?? b.updatedAt ?? b.createdAt).getTime();
    return tb - ta;
  }).slice(0, limit);
}

export interface ResolvedImpactRow {
  name: string;
  resolvedCount: number;
  monthlyCostAddressed: number;
}

export function getResolvedImpactByTeam(reports: FrictionReport[], hourlyRate: number): ResolvedImpactRow[] {
  const map = new Map<string, { n: number; cost: number }>();
  for (const r of getResolvedReports(reports)) {
    const row = map.get(r.team) ?? { n: 0, cost: 0 };
    row.n += 1;
    row.cost += Math.round(calculateMonthlyCost(r, hourlyRate));
    map.set(r.team, row);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, resolvedCount: v.n, monthlyCostAddressed: v.cost }))
    .sort((a, b) => b.monthlyCostAddressed - a.monthlyCostAddressed);
}

export function getResolvedImpactByProcess(reports: FrictionReport[], hourlyRate: number): ResolvedImpactRow[] {
  const map = new Map<string, { n: number; cost: number }>();
  for (const r of getResolvedReports(reports)) {
    const key = r.process.trim() || "—";
    const row = map.get(key) ?? { n: 0, cost: 0 };
    row.n += 1;
    row.cost += Math.round(calculateMonthlyCost(r, hourlyRate));
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, resolvedCount: v.n, monthlyCostAddressed: v.cost }))
    .sort((a, b) => b.monthlyCostAddressed - a.monthlyCostAddressed);
}

export interface HeatmapCell {
  dateKey: string;
  resolvedCount: number;
  hoursSaved: number;
  costSaved: number;
  /** 0 = empty, 1–4 intensity */
  level: number;
  label: string;
}

function intensityLevel(cost: number, maxCost: number): number {
  if (cost <= 0) return 0;
  if (maxCost <= 0) return 1;
  const t = cost / maxCost;
  if (t < 0.25) return 1;
  if (t < 0.5) return 2;
  if (t < 0.75) return 3;
  return 4;
}

/** Last `dayCount` UTC days ending at `endDate` (inclusive), for contribution-style grid. */
export function buildResolutionHeatmapDays(
  reports: FrictionReport[],
  hourlyRate: number,
  endDate: Date,
  dayCount: number,
): HeatmapCell[] {
  const end = startOfUtcDay(endDate);
  const start = addUtcDays(end, -(dayCount - 1));
  const buckets = getResolutionActivityByDay(reports, { hourlyRate, startDate: start, endDate: end });
  const maxCost = Math.max(1, ...buckets.map((b) => b.costSaved));
  return buckets.map((b) => ({
    dateKey: b.dateKey,
    resolvedCount: b.resolvedCount,
    hoursSaved: b.hoursSaved,
    costSaved: b.costSaved,
    level: intensityLevel(b.costSaved, maxCost),
    label:
      b.resolvedCount === 0
        ? `${b.dateKey}: no frictions resolved`
        : `${b.dateKey}: ${b.resolvedCount} resolved, est. ${b.hoursSaved.toFixed(1)} hrs/mo and ${b.costSaved} cost/mo addressed`,
  }));
}
