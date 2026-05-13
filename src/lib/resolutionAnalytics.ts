import { calculateMonthlyCost, calculateMonthlyHours } from "@/lib/frictionCalculations";
import {
  buildContributionCalendar,
  contributionTooltipText,
  dateKeyUtc,
  formatUtcDateKeyLong,
  getContributionLevel,
  getResolutionActivityByDay,
  getResolvedReports,
  resolutionDateKeyForReport,
  type ContributionCalendarCell,
  type HeatmapCell,
  type ResolutionContributionCalendarModel,
} from "@/lib/resolutionContributionCalendar";
import type { FrictionReport } from "@/types";

export * from "./resolutionContributionCalendar";

/** @deprecated Use ResolutionContributionCalendarModel */
export type GithubResolutionHeatmapModel = ResolutionContributionCalendarModel;

export function getUnresolvedReports(reports: FrictionReport[]): FrictionReport[] {
  return reports.filter((r) => r.status !== "resolved");
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Monday UTC week start key YYYY-MM-DD. */
export function startOfWeekMondayUtc(d: Date): Date {
  const c = startOfUtcDay(d);
  const day = c.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(c, diff);
}

export interface ResolutionWeekBucket {
  weekStart: string;
  resolvedCount: number;
  hoursSaved: number;
  costSaved: number;
  reports: FrictionReport[];
}

export function getResolutionActivityByWeek(
  reports: FrictionReport[],
  options: { hourlyRate: number; startDate: Date; endDate: Date },
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
  return [...resolved]
    .sort((a, b) => {
      const ka = resolutionDateKeyForReport(a);
      const kb = resolutionDateKeyForReport(b);
      const ta = ka ? new Date(`${ka}T12:00:00.000Z`).getTime() : new Date(a.updatedAt ?? a.createdAt).getTime();
      const tb = kb ? new Date(`${kb}T12:00:00.000Z`).getTime() : new Date(b.updatedAt ?? b.createdAt).getTime();
      return tb - ta;
    })
    .slice(0, limit);
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

/** @deprecated Prefer buildContributionCalendar */
export function buildGithubResolutionHeatmap(
  reports: FrictionReport[],
  hourlyRate: number,
  options:
    | { kind: "year"; year: number; today?: Date }
    | { kind: "rolling"; endDate: Date; weekCount: number },
  formatMoney: (n: number) => string,
): ResolutionContributionCalendarModel {
  if (options.kind === "year") {
    return buildContributionCalendar(
      reports,
      hourlyRate,
      { mode: "year", year: options.year, today: options.today },
      formatMoney,
    );
  }
  return buildContributionCalendar(
    reports,
    hourlyRate,
    { mode: "rolling", endDate: options.endDate, weekCount: options.weekCount },
    formatMoney,
  );
}

export function resolutionTooltipLine(
  cell: HeatmapCell,
  formatMoney: (n: number) => string,
  layout: ResolutionContributionCalendarModel["layout"] = "calendar-year",
): string {
  return contributionTooltipText(cell, formatMoney, layout);
}

/** @deprecated Prefer buildContributionCalendar year/rolling modes */
export function buildResolutionHeatmapDays(
  reports: FrictionReport[],
  hourlyRate: number,
  endDate: Date,
  dayCount: number,
  formatMoney: (n: number) => string,
): HeatmapCell[] {
  const end = startOfUtcDay(endDate);
  const start = addUtcDays(end, -(dayCount - 1));
  const buckets = getResolutionActivityByDay(reports, { hourlyRate, startDate: start, endDate: end });
  const maxCost = Math.max(0, ...buckets.map((b) => b.costSaved));
  const maxCount = Math.max(0, ...buckets.map((b) => b.resolvedCount));
  const useCost = maxCost > 0;
  return buckets.map((b) => {
    const level =
      useCost ? getContributionLevel(b.costSaved, maxCost) : getContributionLevel(b.resolvedCount, Math.max(1, maxCount));
    const dayKind = "eligible" as const;
    const cell: ContributionCalendarCell = {
      dateKey: b.dateKey,
      resolvedCount: b.resolvedCount,
      hoursSaved: b.hoursSaved,
      costSaved: b.costSaved,
      level,
      label: "",
      prettyDate: formatUtcDateKeyLong(b.dateKey),
      reports: b.reports,
      dayKind,
      elapsedInSelectedYear: dayKind === "eligible",
    };
    cell.label =
      b.resolvedCount === 0
        ? `${formatUtcDateKeyLong(b.dateKey)}: no frictions resolved`
        : `${formatUtcDateKeyLong(b.dateKey)}: ${b.resolvedCount} resolved, ${b.hoursSaved.toFixed(1)} hrs/mo, ${formatMoney(b.costSaved)}/mo`;
    return cell;
  });
}

export function intensityLevelFromCount(count: number, maxCount: number): number {
  return getContributionLevel(count, Math.max(1, maxCount));
}
