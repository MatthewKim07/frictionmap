import { AVERAGE_HOURLY_COST, SEVERITIES } from "@/constants/friction";
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
  selectedSeverity: Severity | null;
}

/** USD, whole dollars, en-US. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Hours for dashboards — avoids noisy decimals. */
export function formatHours(value: number): string {
  if (!Number.isFinite(value)) return "0 hrs";
  if (value >= 100) return `${Math.round(value)} hrs`;
  const r = Math.round(value * 10) / 10;
  return `${r} hrs`;
}

export function formatReportDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

const SEVERITY_CHART_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

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
    if (filters.selectedSeverity && r.severity !== filters.selectedSeverity) return false;
    return true;
  });
}

export function getOpenReportCount(reports: FrictionReport[]): number {
  return reports.filter((r) => r.status === "open").length;
}

export function getCriticalHighCount(reports: FrictionReport[]): number {
  return reports.filter((r) => r.severity === "critical" || r.severity === "high").length;
}

export function getAverageFrictionScore(reports: FrictionReport[]): number {
  if (!reports.length) return 0;
  const sum = reports.reduce((s, r) => s + calculateFrictionScore(r), 0);
  return Math.round(sum / reports.length);
}

export function getSeverityCounts(reports: FrictionReport[]): { severity: Severity; label: string; count: number }[] {
  const m: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const r of reports) m[r.severity]++;
  return SEVERITIES.map((severity) => ({
    severity,
    label: SEVERITY_CHART_LABEL[severity],
    count: m[severity],
  }));
}

export interface ProcessCostRow {
  process: string;
  teamLabel: string;
  category: FrictionCategory;
  monthlyHours: number;
  monthlyCost: number;
  reportCount: number;
}

/** Aggregated by process/tool, sorted by monthly cost descending. */
export function getProcessCostRanking(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
): ProcessCostRow[] {
  const byProcess = groupReportsByProcess(reports);
  return Object.entries(byProcess)
    .map(([process, rows]) => {
      const monthlyHours = rows.reduce((s, r) => s + calculateMonthlyHours(r), 0);
      const monthlyCost = Math.round(monthlyHours * hourlyRate);
      const teams = [...new Set(rows.map((r) => r.team))];
      const teamLabel = teams.length === 1 ? teams[0]! : `${teams.length} teams`;
      const category = rows[0]!.category;
      return { process, teamLabel, category, monthlyHours, monthlyCost, reportCount: rows.length };
    })
    .sort((a, b) => b.monthlyCost - a.monthlyCost);
}

export interface TeamCostRow {
  team: Team;
  monthlyHours: number;
  monthlyCost: number;
}

export function getTeamMonthlyCosts(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
): TeamCostRow[] {
  const byTeam = groupReportsByTeam(reports);
  return Object.entries(byTeam)
    .map(([team, rows]) => {
      const monthlyHours = rows.reduce((s, r) => s + calculateMonthlyHours(r), 0);
      return {
        team: team as Team,
        monthlyHours,
        monthlyCost: Math.round(monthlyHours * hourlyRate),
      };
    })
    .sort((a, b) => b.monthlyCost - a.monthlyCost);
}

/**
 * Rule-based manager summary for the current filtered dataset.
 */
export function buildInsightsPlainSummary(reports: FrictionReport[], hourlyRate: number = AVERAGE_HOURLY_COST): string {
  if (!reports.length) return "";

  const top = getTopCategory(reports);
  const topCatCost = Math.round(top.monthlyHours * hourlyRate);
  const proc = getHighestCostProcess(reports);
  const crit = getCriticalHighCount(reports);

  let text = `${top.category} is currently the largest source of lost time, costing an estimated ${formatCurrency(topCatCost)} per month.`;

  if (proc.process && proc.monthlyCost > 0) {
    text += ` The highest-cost process cluster is ${proc.process} (${formatCurrency(Math.round(proc.monthlyCost))} per month).`;
  }

  if (crit > 0) {
    text += ` ${crit} ${crit === 1 ? "report is" : "reports are"} high or critical severity — worth triaging before lower-impact items.`;
  } else {
    text += " No high or critical severity in this view; still review recurring medium drag so it does not compound.";
  }

  return text;
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
