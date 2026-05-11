import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import type {
  FrictionCategory,
  Frequency,
  ReportStatus,
  Severity,
  Team,
} from "@/constants/friction";
import type { DashboardMetrics, FrictionReport } from "@/types";

export interface FrictionFilters {
  selectedTeam: Team | null;
  selectedCategory: FrictionCategory | null;
  selectedStatus: ReportStatus | null;
}

export function frequencyMultiplier(frequency: Frequency): number {
  const m: Record<Frequency, number> = {
    once: 1,
    monthly: 1,
    weekly: 4,
    daily: 20,
  };
  return m[frequency];
}

export function severityMultiplier(severity: Severity): number {
  const m: Record<Severity, number> = {
    low: 1,
    medium: 1.5,
    high: 2,
    critical: 3,
  };
  return m[severity];
}

/** Hours lost per month for one report (occurrence hours × frequency factor). */
export function calculateMonthlyHours(report: FrictionReport): number {
  return report.timeLostHours * frequencyMultiplier(report.frequency);
}

export function calculateMonthlyCost(
  report: FrictionReport,
  hourlyRate: number = AVERAGE_HOURLY_COST,
): number {
  return calculateMonthlyHours(report) * hourlyRate;
}

export function calculateFrictionScore(report: FrictionReport): number {
  return calculateMonthlyHours(report) * severityMultiplier(report.severity) * frequencyMultiplier(report.frequency);
}

const CADENCE_PHRASE: Record<Frequency, string> = {
  once: "If it happens once",
  monthly: "If it happens every month",
  weekly: "If it happens every week",
  daily: "If it happens every day",
};

/**
 * Plain-English impact line for previews and confirmations (uses shared calculators).
 */
export function buildImpactNarrative(report: FrictionReport): string {
  const hours = calculateMonthlyHours(report);
  const cost = Math.round(calculateMonthlyCost(report));
  const hoursDisp = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;

  const impact =
    report.severity === "critical" || report.severity === "high"
      ? "a high-impact workflow drag"
      : report.severity === "medium"
        ? "a meaningful slowdown"
        : "lighter friction, but it still adds up";

  return `This looks like ${impact}. ${CADENCE_PHRASE[report.frequency]}, it may cost about ${hoursDisp} hours or $${cost.toLocaleString()} per month.`;
}

export function calculateTotalMonthlyHours(reports: FrictionReport[]): number {
  return reports.reduce((sum, r) => sum + calculateMonthlyHours(r), 0);
}

export function calculateTotalMonthlyCost(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
): number {
  return calculateTotalMonthlyHours(reports) * hourlyRate;
}

export function calculateAnnualizedCost(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
): number {
  return calculateTotalMonthlyCost(reports, hourlyRate) * 12;
}

function groupBy<T extends FrictionReport>(reports: T[], keyFn: (r: T) => string): Record<string, T[]> {
  return reports.reduce<Record<string, T[]>>((acc, r) => {
    const k = keyFn(r);
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}

export function groupReportsByCategory(reports: FrictionReport[]): Record<string, FrictionReport[]> {
  return groupBy(reports, (r) => r.category);
}

export function groupReportsByTeam(reports: FrictionReport[]): Record<string, FrictionReport[]> {
  return groupBy(reports, (r) => r.team);
}

export function groupReportsByProcess(reports: FrictionReport[]): Record<string, FrictionReport[]> {
  return groupBy(reports, (r) => r.process);
}

export function groupReportsBySeverity(reports: FrictionReport[]): Record<string, FrictionReport[]> {
  return groupBy(reports, (r) => r.severity);
}

export function getTopCategory(reports: FrictionReport[]): {
  category: FrictionCategory;
  monthlyHours: number;
} {
  if (!reports.length) {
    return { category: "Manual data entry", monthlyHours: 0 };
  }
  const byCat = groupReportsByCategory(reports);
  let bestCategory = reports[0]!.category;
  let bestHours = 0;
  for (const [cat, rows] of Object.entries(byCat)) {
    const h = rows.reduce((s, r) => s + calculateMonthlyHours(r), 0);
    if (h > bestHours) {
      bestHours = h;
      bestCategory = cat as FrictionCategory;
    }
  }
  return { category: bestCategory, monthlyHours: bestHours };
}

export function getHighestCostProcess(reports: FrictionReport[]): {
  process: string;
  monthlyCost: number;
} {
  const byProcess = groupReportsByProcess(reports);
  let best = { process: "", monthlyCost: 0 };
  for (const [process, rows] of Object.entries(byProcess)) {
    const monthlyCost = rows.reduce((s, r) => s + calculateMonthlyCost(r), 0);
    if (monthlyCost > best.monthlyCost) best = { process, monthlyCost };
  }
  return best;
}

export function getRecentReports(reports: FrictionReport[], limit: number): FrictionReport[] {
  return [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function filterReports(reports: FrictionReport[], filters: FrictionFilters): FrictionReport[] {
  return reports.filter((r) => {
    if (filters.selectedTeam && r.team !== filters.selectedTeam) return false;
    if (filters.selectedCategory && r.category !== filters.selectedCategory) return false;
    if (filters.selectedStatus && r.status !== filters.selectedStatus) return false;
    return true;
  });
}

export function buildDashboardMetrics(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
): DashboardMetrics {
  const monthlyHours = calculateTotalMonthlyHours(reports);
  const monthlyCostLost = Math.round(monthlyHours * hourlyRate);
  const annualizedCostLost = Math.round(monthlyCostLost * 12);

  const byCategoryHours: Record<string, number> = {};
  for (const r of reports) {
    const h = calculateMonthlyHours(r);
    byCategoryHours[r.category] = (byCategoryHours[r.category] ?? 0) + h;
  }

  const byTeamHours: Record<string, number> = {};
  for (const r of reports) {
    const h = calculateMonthlyHours(r);
    byTeamHours[r.team] = (byTeamHours[r.team] ?? 0) + h;
  }

  const top = getTopCategory(reports);

  return {
    monthlyHoursLost: Math.round(monthlyHours),
    monthlyCostLost,
    annualizedCostLost,
    reportCount: reports.length,
    topCategory: top.category,
    topCategoryMonthlyHours: Math.round(top.monthlyHours),
    byCategoryHours,
    byTeamHours,
  };
}
