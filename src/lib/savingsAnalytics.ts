/**
 * Directional savings and resolution analytics derived from friction reports
 * and roadmap clusters. Copy uses "estimated" / "potential" — not guarantees.
 */

import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import { buildDashboardMetrics, calculateMonthlyCost } from "@/lib/frictionCalculations";
import type { DerivedRoadmapItem, FrictionReport } from "@/types";

export interface SavingsAnalytics {
  /** Same basis as dashboard “monthly cost leakage” for this report set. */
  totalMonthlyLeakage: number;
  /** Sum of per-report estimated monthly cost for reports marked resolved. */
  resolvedMonthlyCost: number;
  /** Non-resolved reports’ estimated monthly cost (directional). */
  remainingOpenMonthlyCost: number;
  /** Sum of cluster monthly cost for the top 3 roadmap rows (if fully resolved). */
  potentialTop3MonthlySavings: number;
  /** Sum of cluster monthly cost for roadmap rows ranked Critical. */
  potentialCriticalMonthlySavings: number;
  /** Directional leakage if the top 3 clusters were fully addressed. */
  estimatedLeakageAfterTop3: number;
  /** Same as potentialTop3MonthlySavings — explicit label for UI. */
  estimatedMonthlySavingsFromTop3: number;
  estimatedAnnualSavingsFromTop3: number;
  /** Resolved cost ÷ total leakage, capped at 100. */
  percentCostAddressed: number;
  resolvedReportCount: number;
  criticalRoadmapClusterCount: number;
}

export function computeSavingsAnalytics(
  reports: FrictionReport[],
  hourlyRate: number,
  roadmapItems: DerivedRoadmapItem[],
): SavingsAnalytics {
  const totalMonthlyLeakage = buildDashboardMetrics(reports, hourlyRate).monthlyCostLost;

  const resolvedReports = reports.filter((r) => r.status === "resolved");
  const resolvedMonthlyCost = resolvedReports.reduce(
    (s, r) => s + Math.round(calculateMonthlyCost(r, hourlyRate)),
    0,
  );

  const remainingOpenMonthlyCost = Math.max(0, totalMonthlyLeakage - resolvedMonthlyCost);

  const top3 = roadmapItems.slice(0, 3);
  const potentialTop3MonthlySavings = top3.reduce((s, it) => s + Math.round(it.monthlyCost), 0);

  const criticalItems = roadmapItems.filter((it) => it.priorityLevel === "Critical");
  const potentialCriticalMonthlySavings = criticalItems.reduce((s, it) => s + Math.round(it.monthlyCost), 0);

  const estimatedMonthlySavingsFromTop3 = potentialTop3MonthlySavings;
  const estimatedLeakageAfterTop3 = Math.max(0, totalMonthlyLeakage - potentialTop3MonthlySavings);

  const percentCostAddressed =
    totalMonthlyLeakage > 0 ? Math.min(100, Math.round((resolvedMonthlyCost / totalMonthlyLeakage) * 100)) : 0;

  return {
    totalMonthlyLeakage,
    resolvedMonthlyCost,
    remainingOpenMonthlyCost,
    potentialTop3MonthlySavings,
    potentialCriticalMonthlySavings,
    estimatedLeakageAfterTop3,
    estimatedMonthlySavingsFromTop3,
    estimatedAnnualSavingsFromTop3: estimatedMonthlySavingsFromTop3 * 12,
    percentCostAddressed,
    resolvedReportCount: resolvedReports.length,
    criticalRoadmapClusterCount: criticalItems.length,
  };
}

export interface ImpactFunnelStep {
  label: string;
  value: number;
  /** When set, value is a currency amount (monthly) rather than a count. */
  kind: "count" | "currency";
}

export function buildImpactFunnel(
  reports: FrictionReport[],
  roadmapItems: DerivedRoadmapItem[],
  resolvedMonthlyCost: number,
): ImpactFunnelStep[] {
  return [
    { label: "Reports submitted", value: reports.length, kind: "count" },
    { label: "Bottlenecks identified", value: roadmapItems.length, kind: "count" },
    { label: "Fixes planned", value: reports.filter((r) => r.status === "planned").length, kind: "count" },
    { label: "Fixes resolved", value: reports.filter((r) => r.status === "resolved").length, kind: "count" },
    { label: "Est. cost addressed (resolved)", value: resolvedMonthlyCost, kind: "currency" },
  ];
}

export type TrendBucket = "week" | "month";

export interface ReportTrendPoint {
  periodKey: string;
  periodLabel: string;
  reportCount: number;
  /** Sum of estimated monthly cost for reports whose createdAt falls in this bucket. */
  estimatedMonthlyCostInBucket: number;
}

function startOfWeekMonday(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(y, m - 1, 1));
}

/** Prefer month buckets when report dates span more than ~12 weeks. */
export function suggestTrendBucket(reports: FrictionReport[]): TrendBucket {
  const ts = reports
    .map((r) => new Date(r.createdAt).getTime())
    .filter((t) => Number.isFinite(t));
  if (ts.length < 2) return "week";
  const spanDays = (Math.max(...ts) - Math.min(...ts)) / 86400000;
  return spanDays > 84 ? "month" : "week";
}

export function buildReportSubmissionTrend(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
  bucket: TrendBucket = "week",
): ReportTrendPoint[] {
  const map = new Map<string, { count: number; cost: number }>();

  for (const r of reports) {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;

    let periodKey: string;
    if (bucket === "month") {
      periodKey = monthKey(d);
    } else {
      const mon = startOfWeekMonday(d);
      periodKey = mon.toISOString().slice(0, 10);
    }

    const cost = Math.round(calculateMonthlyCost(r, hourlyRate));
    const cur = map.get(periodKey) ?? { count: 0, cost: 0 };
    cur.count += 1;
    cur.cost += cost;
    map.set(periodKey, cur);
  }

  const sortedKeys = [...map.keys()].sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((periodKey) => {
    const row = map.get(periodKey)!;
    let periodLabel: string;
    if (bucket === "month") {
      periodLabel = formatMonthLabel(periodKey);
    } else {
      try {
        const wd = new Date(`${periodKey}T12:00:00`);
        periodLabel = `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(wd)}`;
      } catch {
        periodLabel = periodKey;
      }
    }

    return {
      periodKey,
      periodLabel,
      reportCount: row.count,
      estimatedMonthlyCostInBucket: row.cost,
    };
  });
}
