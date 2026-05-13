/**
 * Resolution contribution calendar — UTC day buckets + GitHub-style year/week grids.
 * Kept separate from resolutionAnalytics.ts to avoid circular imports.
 */
import { calculateMonthlyCost, calculateMonthlyHours } from "@/lib/frictionCalculations";
import { enrichFrictionReportFromStorage } from "@/lib/reportStatusTimestamps";
import type { FrictionReport } from "@/types";

export interface ResolutionAnalyticsOptions {
  hourlyRate: number;
}

export function getResolvedReports(reports: FrictionReport[]): FrictionReport[] {
  return reports.filter((r) => r.status === "resolved");
}

/**
 * UTC calendar day (YYYY-MM-DD) for a resolved report.
 * Source of truth: resolvedAt; if missing, updatedAt (never createdAt) so reopened items stay off wrong days.
 */
export function resolutionDateKeyForReport(r: FrictionReport): string | null {
  if (r.status !== "resolved") return null;
  const raw = r.resolvedAt ?? r.updatedAt ?? null;
  if (!raw) return null;
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

export function dateKeyUtc(d: Date): string {
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

export type ContributionDayKind = "padding" | "future" | "eligible";

export interface ContributionCalendarCell {
  dateKey: string;
  resolvedCount: number;
  hoursSaved: number;
  costSaved: number;
  level: number;
  label: string;
  prettyDate: string;
  reports: FrictionReport[];
  dayKind: ContributionDayKind;
  /** True for days in the selected calendar year that are not "future" (past years = all true). */
  elapsedInSelectedYear: boolean;
}

/** @deprecated Use ContributionCalendarCell */
export type HeatmapCell = ContributionCalendarCell;

export interface YearResolutionTotals {
  frictionCount: number;
  monthlyHoursAddressed: number;
  monthlyCostAddressed: number;
  annualizedCostAddressed: number;
}

export interface ResolutionContributionCalendarModel {
  mode: "year" | "rolling";
  year: number | null;
  weekCount: number | null;
  /** GitHub-style ~53 weeks ending Saturday of current week when viewing the current UTC year. */
  layout: "calendar-year" | "github-rolling";
  headline: string;
  yearTotals: YearResolutionTotals | null;
  emptyYearMessage: string | null;
  columns: ContributionCalendarCell[][];
  monthLabels: { columnIndex: number; label: string }[];
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function ordinalDay(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function utcSundayOnOrBefore(d: Date): Date {
  const s = startOfUtcDay(d);
  const dow = s.getUTCDay();
  return addUtcDays(s, -dow);
}

function utcSaturdayOnOrAfter(d: Date): Date {
  const s = startOfUtcDay(d);
  const dow = s.getUTCDay();
  return addUtcDays(s, 6 - dow);
}

function inUtcCalendarYear(d: Date, year: number): boolean {
  return d.getUTCFullYear() === year;
}

export function getDefaultOrganizationCreatedAtFromReports(reports: FrictionReport[]): string {
  const today = startOfUtcDay(new Date());
  const capMs = addUtcDays(today, -365).getTime();

  let earliestMs = Infinity;
  for (const r of reports) {
    for (const raw of [r.createdAt, r.resolvedAt, r.updatedAt] as const) {
      if (!raw) continue;
      const t = new Date(raw).getTime();
      if (Number.isFinite(t)) earliestMs = Math.min(earliestMs, t);
    }
  }

  // No data yet: anchor the org to Jan 1 of the current UTC year so the year list is not polluted
  // by a synthetic "365 days ago" date (which would add a prior calendar year for brand-new workspaces).
  if (!Number.isFinite(earliestMs)) {
    return dateKeyUtc(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)));
  }

  // With data: never start the default *before* the oldest report (new orgs), but cap how far back
  // we pretend history existed for mature demo datasets (at most ~12 months before "today").
  const startMs = Math.max(earliestMs, capMs);
  return dateKeyUtc(new Date(startMs));
}

/** Persisted org start date, or earliest sensible default from reports (UTC day key). */
export function getOrganizationStartDate(
  settings: { organizationCreatedAt?: string },
  reports: FrictionReport[],
): string {
  const raw = settings.organizationCreatedAt?.trim().slice(0, 10) ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t = new Date(`${raw}T12:00:00.000Z`).getTime();
    if (Number.isFinite(t)) return raw;
  }
  return getDefaultOrganizationCreatedAtFromReports(reports);
}

/**
 * True when persisted org start looks like the old "min(earliest, today−365d)" default while all report
 * timestamps are in the current UTC year or later — safe to replace with the corrected default on hydrate.
 */
export function shouldResetStaleOrganizationStart(
  storedIso: string | undefined,
  reports: FrictionReport[],
  today: Date = new Date(),
): boolean {
  if (!storedIso) return false;
  const t = storedIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const today0 = startOfUtcDay(today);
  const yCur = today0.getUTCFullYear();
  const yOldAnchor = addUtcDays(today0, -365).getUTCFullYear();
  const yStored = Number(t.slice(0, 4));
  if (yStored !== yOldAnchor) return false;

  let minDataY = Infinity;
  for (const r of reports) {
    for (const raw of [r.createdAt, r.resolvedAt, r.updatedAt] as const) {
      if (!raw) continue;
      const y = new Date(raw).getUTCFullYear();
      if (Number.isFinite(y)) minDataY = Math.min(minDataY, y);
    }
  }
  if (!Number.isFinite(minDataY)) return true;
  return minDataY >= yCur;
}

/** Normalize timestamps after load (safe for heatmap / buckets). */
export function normalizeResolvedReportDates(reports: FrictionReport[]): FrictionReport[] {
  return reports.map((r) => enrichFrictionReportFromStorage({ ...r }));
}

export function getAvailableResolutionYears(organizationCreatedAtIso: string, currentYear: number): number[] {
  const trimmed = organizationCreatedAtIso.trim().slice(0, 10);
  const y0 = Number(trimmed.slice(0, 4));
  const startYear = Number.isFinite(y0) ? y0 : currentYear;
  const first = Math.min(startYear, currentYear);
  const years: number[] = [];
  for (let y = first; y <= currentYear; y++) years.push(y);
  return years.length ? years : [currentYear];
}

/** Map a numeric value to 0–4 contribution level vs max within the view (relative scale). */
export function getContributionLevel(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  if (maxValue <= 0) return 1;
  const t = value / maxValue;
  if (t < 0.25) return 1;
  if (t < 0.5) return 2;
  if (t < 0.75) return 3;
  return 4;
}

export function getYearResolutionSummary(
  reports: FrictionReport[],
  year: number,
  hourlyRate: number,
  today: Date = new Date(),
): YearResolutionTotals {
  const todayKey = dateKeyUtc(startOfUtcDay(today));
  const yearEndKey = dateKeyUtc(new Date(Date.UTC(year, 11, 31)));
  const lastKey = year === startOfUtcDay(today).getUTCFullYear() ? (todayKey < yearEndKey ? todayKey : yearEndKey) : yearEndKey;

  let frictionCount = 0;
  let monthlyHoursAddressed = 0;
  let monthlyCostAddressed = 0;
  for (const r of getResolvedReports(reports)) {
    const dk = resolutionDateKeyForReport(r);
    if (!dk) continue;
    if (!dk.startsWith(`${year}-`)) continue;
    if (dk > lastKey) continue;
    frictionCount += 1;
    monthlyHoursAddressed += calculateMonthlyHours(r);
    monthlyCostAddressed += Math.round(calculateMonthlyCost(r, hourlyRate));
  }
  return {
    frictionCount,
    monthlyHoursAddressed,
    monthlyCostAddressed,
    annualizedCostAddressed: monthlyCostAddressed * 12,
  };
}

/** GitHub contribution graph: 53 full week columns. */
export const GITHUB_ROLLING_WEEK_COLUMNS = 53;

/** Resolved-impact totals for UTC date keys in [rangeStart, rangeEndInclusive] (inclusive, YYYY-MM-DD). */
export function getResolutionTotalsUtcRange(
  reports: FrictionReport[],
  hourlyRate: number,
  rangeStart: Date,
  rangeEndInclusive: Date,
): YearResolutionTotals {
  const startKey = dateKeyUtc(startOfUtcDay(rangeStart));
  const endKey = dateKeyUtc(startOfUtcDay(rangeEndInclusive));
  let frictionCount = 0;
  let monthlyHoursAddressed = 0;
  let monthlyCostAddressed = 0;
  for (const r of getResolvedReports(reports)) {
    const dk = resolutionDateKeyForReport(r);
    if (!dk) continue;
    if (dk < startKey || dk > endKey) continue;
    frictionCount += 1;
    monthlyHoursAddressed += calculateMonthlyHours(r);
    monthlyCostAddressed += Math.round(calculateMonthlyCost(r, hourlyRate));
  }
  return {
    frictionCount,
    monthlyHoursAddressed,
    monthlyCostAddressed,
    annualizedCostAddressed: monthlyCostAddressed * 12,
  };
}

/** Last column ends Saturday of the week containing `today`; grid covers 53 weeks ending there (UTC). */
export function githubRollingContributionGridBounds(today: Date): { gridStart: Date; gridEnd: Date } {
  const gridEnd = utcSaturdayOnOrAfter(today);
  const gridStart = utcSundayOnOrBefore(addUtcDays(gridEnd, -(GITHUB_ROLLING_WEEK_COLUMNS * 7 - 1)));
  return { gridStart, gridEnd };
}

export function formatUtcDateKeyLong(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!y || !m || !day) return dateKey;
  const d = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${MONTH_LONG[d.getUTCMonth()]} ${ordinalDay(d.getUTCDate())}`;
}

export function formatUtcDateKeyMedium(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!y || !m || !day) return dateKey;
  const d = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(d.getTime())) return dateKey;
  return `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function buildAriaLabel(
  cell: ContributionCalendarCell,
  formatMoney: (n: number) => string,
  layout: ResolutionContributionCalendarModel["layout"],
): string {
  if (cell.dayKind === "padding") return `${formatUtcDateKeyMedium(cell.dateKey)}: outside selected calendar grid`;
  if (cell.dayKind === "future") {
    const scope = layout === "calendar-year" ? "this calendar year's totals" : "the displayed period";
    return `${formatUtcDateKeyMedium(cell.dateKey)}: upcoming day (UTC), not counted toward ${scope}`;
  }
  if (cell.resolvedCount === 0) return `${formatUtcDateKeyMedium(cell.dateKey)}: no frictions resolved`;
  return `${formatUtcDateKeyMedium(cell.dateKey)}: ${cell.resolvedCount} resolved, ${cell.hoursSaved.toFixed(1)} hours per month, ${formatMoney(cell.costSaved)} per month`;
}

export function contributionTooltipText(
  cell: ContributionCalendarCell,
  formatMoney: (n: number) => string,
  layout: ResolutionContributionCalendarModel["layout"] = "calendar-year",
): string {
  if (cell.dayKind === "padding") return "Outside the selected calendar.";
  if (cell.dayKind === "future") {
    return layout === "calendar-year"
      ? "Upcoming day (UTC) — not counted in this calendar year's totals."
      : "Upcoming day (UTC) — not counted in this graph's totals.";
  }
  const when = formatUtcDateKeyMedium(cell.dateKey);
  if (cell.resolvedCount === 0) return `${when}: No frictions resolved.`;
  const titles =
    cell.reports.length > 0 && cell.reports.length <= 3
      ? ` ${cell.reports.map((r) => `“${r.title}”`).join(" ")}`
      : "";
  return `${when}: ${cell.resolvedCount} friction${cell.resolvedCount === 1 ? "" : "s"} resolved, ${cell.hoursSaved.toFixed(1)} monthly hours addressed, ${formatMoney(cell.costSaved)}/month addressed.${titles}`;
}

export function buildContributionCalendar(
  reports: FrictionReport[],
  hourlyRate: number,
  options: { mode: "year"; year: number; today?: Date } | { mode: "rolling"; endDate: Date; weekCount: number },
  formatMoney: (n: number) => string,
): ResolutionContributionCalendarModel {
  const today = startOfUtcDay(options.mode === "year" ? options.today ?? new Date() : options.endDate);
  let gridStart: Date;
  let gridEnd: Date;
  let year: number | null;
  let weekCount: number | null = null;
  let yearTotals: YearResolutionTotals | null = null;
  let headline: string;
  let emptyYearMessage: string | null = null;
  let layout: ResolutionContributionCalendarModel["layout"] = "calendar-year";

  if (options.mode === "year") {
    year = options.year;
    const currentUtcYear = today.getUTCFullYear();
    const useGithubRolling = year === currentUtcYear;

    if (useGithubRolling) {
      layout = "github-rolling";
      const bounds = githubRollingContributionGridBounds(today);
      gridStart = bounds.gridStart;
      gridEnd = bounds.gridEnd;
      weekCount = GITHUB_ROLLING_WEEK_COLUMNS;
      yearTotals = getResolutionTotalsUtcRange(reports, hourlyRate, gridStart, today);
      headline = `${yearTotals.frictionCount.toLocaleString()} friction${yearTotals.frictionCount === 1 ? "" : "s"} resolved in the last year`;
      if (yearTotals.frictionCount === 0) emptyYearMessage = "No frictions resolved in the last year yet.";
    } else {
      const jan1 = new Date(Date.UTC(year, 0, 1));
      const dec31 = new Date(Date.UTC(year, 11, 31));
      gridStart = utcSundayOnOrBefore(jan1);
      gridEnd = utcSaturdayOnOrAfter(dec31);
      yearTotals = getYearResolutionSummary(reports, year, hourlyRate, today);
      headline = `${yearTotals.frictionCount.toLocaleString()} friction${yearTotals.frictionCount === 1 ? "" : "s"} resolved in ${year}`;
      if (yearTotals.frictionCount === 0) emptyYearMessage = "No frictions resolved in this year yet.";
    }
  } else {
    year = null;
    layout = "github-rolling";
    weekCount = options.weekCount;
    const end = startOfUtcDay(options.endDate);
    const saturdayEnd = utcSaturdayOnOrAfter(end);
    const lastSunday = addUtcDays(saturdayEnd, -6);
    gridStart = addUtcDays(lastSunday, -7 * (options.weekCount - 1));
    gridEnd = saturdayEnd;
    const totals = getResolutionActivityByDay(reports, { hourlyRate, startDate: gridStart, endDate: gridEnd });
    let fc = 0;
    let hrs = 0;
    let cost = 0;
    const todayKey = dateKeyUtc(today);
    for (const b of totals) {
      if (b.dateKey > todayKey) continue;
      fc += b.resolvedCount;
      hrs += b.hoursSaved;
      cost += b.costSaved;
    }
    yearTotals = {
      frictionCount: fc,
      monthlyHoursAddressed: hrs,
      monthlyCostAddressed: cost,
      annualizedCostAddressed: cost * 12,
    };
    headline = `${fc.toLocaleString()} friction${fc === 1 ? "" : "s"} in last ${options.weekCount} weeks`;
    emptyYearMessage = null;
  }

  const buckets = getResolutionActivityByDay(reports, { hourlyRate, startDate: gridStart, endDate: gridEnd });
  const byKey = new Map(buckets.map((b) => [b.dateKey, b]));

  let daySpan = 0;
  for (let d = new Date(gridStart); d.getTime() <= gridEnd.getTime(); d = addUtcDays(d, 1)) {
    daySpan++;
  }
  const numWeeks = daySpan / 7;
  if (!Number.isInteger(numWeeks) || numWeeks < 1) {
    throw new Error(`contribution calendar: expected whole weeks, got ${numWeeks} (${daySpan} days)`);
  }

  const calendarYearForCells =
    options.mode === "year" && layout === "calendar-year" ? options.year : null;

  const dayKindFor = (d: Date): ContributionDayKind => {
    if (calendarYearForCells != null) {
      if (!inUtcCalendarYear(d, calendarYearForCells)) return "padding";
    }
    if (d.getTime() > today.getTime()) return "future";
    return "eligible";
  };

  const costsForMax: number[] = [];
  const countsForMax: number[] = [];

  for (let w = 0; w < numWeeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = addUtcDays(gridStart, w * 7 + dow);
      const key = dateKeyUtc(d);
      const dayKind = dayKindFor(d);
      if (dayKind === "eligible") {
        const b = byKey.get(key);
        costsForMax.push(b?.costSaved ?? 0);
        countsForMax.push(b?.resolvedCount ?? 0);
      }
    }
  }

  const maxCost = Math.max(0, ...costsForMax);
  const maxCount = Math.max(0, ...countsForMax);
  const useCost = maxCost > 0;

  const columns: ContributionCalendarCell[][] = [];
  const monthLabels: { columnIndex: number; label: string }[] = [];

  for (let w = 0; w < numWeeks; w++) {
    const col: ContributionCalendarCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = addUtcDays(gridStart, w * 7 + dow);
      const key = dateKeyUtc(d);
      const dayKind = dayKindFor(d);

      const b = byKey.get(key);
      const resolvedCount = b?.resolvedCount ?? 0;
      const hoursSaved = b?.hoursSaved ?? 0;
      const costSaved = b?.costSaved ?? 0;
      const dayReports = b?.reports ?? [];
      const prettyDate = formatUtcDateKeyLong(key);

      let level = 0;
      if (dayKind === "padding" || dayKind === "future") level = 0;
      else if (useCost) level = getContributionLevel(costSaved, maxCost);
      else level = getContributionLevel(resolvedCount, Math.max(1, maxCount));

      const elapsedInSelectedYear = dayKind === "eligible" && d.getTime() <= today.getTime();

      const cell: ContributionCalendarCell = {
        dateKey: key,
        resolvedCount,
        hoursSaved,
        costSaved,
        level,
        label: "",
        prettyDate,
        reports: dayReports,
        dayKind,
        elapsedInSelectedYear,
      };
      cell.label = buildAriaLabel(cell, formatMoney, layout);
      col.push(cell);
    }
    columns.push(col);
  }

  if (options.mode === "year" && layout === "calendar-year") {
    const y = options.year;
    for (let m = 0; m < 12; m++) {
      const first = new Date(Date.UTC(y, m, 1));
      const colIdx = Math.floor((startOfUtcDay(first).getTime() - gridStart.getTime()) / (7 * 86_400_000));
      if (colIdx >= 0 && colIdx < numWeeks) {
        monthLabels.push({ columnIndex: colIdx, label: MONTH_SHORT[m] });
      }
    }
  } else {
    for (let c = 0; c < numWeeks; c++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = addUtcDays(gridStart, c * 7 + dow);
        if (d.getUTCDate() === 1) {
          monthLabels.push({ columnIndex: c, label: MONTH_SHORT[d.getUTCMonth()] });
          break;
        }
      }
    }
  }

  return {
    mode: options.mode,
    year,
    weekCount,
    layout,
    headline,
    yearTotals,
    emptyYearMessage,
    columns,
    monthLabels,
  };
}
