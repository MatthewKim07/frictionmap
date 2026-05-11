import type { DashboardMetrics, FrictionReport } from "@/types";
import type { Frequency, FrictionCategoryId, Severity } from "@/data/constants";
import {
  ANNUAL_SAVINGS_CAPTURE_RATE,
  BLENDED_HOURLY_USD,
} from "@/data/constants";

/** Rough occurrences per month used for monthly hour/cost estimates. */
export const OCCURRENCES_PER_MONTH: Record<Frequency, number> = {
  Daily: 22,
  Weekly: 4,
  Monthly: 1,
  "One-off": 1,
};

export function occurrencesPerMonth(frequency: Frequency): number {
  return OCCURRENCES_PER_MONTH[frequency];
}

/** Scoring weight — emphasizes chronic drag without double-counting calendar math. */
export function frequencyMultiplier(frequency: Frequency): number {
  const scale: Record<Frequency, number> = {
    Daily: 1.35,
    Weekly: 1.1,
    Monthly: 0.85,
    "One-off": 0.45,
  };
  return scale[frequency];
}

export function severityMultiplier(severity: Severity): number {
  const scale: Record<Severity, number> = {
    1: 0.65,
    2: 1,
    3: 1.45,
    4: 1.85,
  };
  return scale[severity];
}

export function monthlyHoursLostForReport(report: FrictionReport): number {
  return report.timeLostHours * occurrencesPerMonth(report.frequency);
}

export function monthlyCostLostForReport(
  report: FrictionReport,
  hourlyRateUsd: number = BLENDED_HOURLY_USD,
): number {
  return monthlyHoursLostForReport(report) * hourlyRateUsd;
}

export function annualizedCostFromMonthly(monthlyUsd: number): number {
  return monthlyUsd * 12;
}

export function frictionScore(report: FrictionReport): number {
  const monthlyHours = monthlyHoursLostForReport(report);
  return monthlyHours * severityMultiplier(report.severity) * frequencyMultiplier(report.frequency);
}

export function buildDashboardMetrics(
  reports: FrictionReport[],
  hourlyRateUsd: number = BLENDED_HOURLY_USD,
): DashboardMetrics {
  let monthlyHours = 0;
  const byCategoryHours: Record<string, number> = {};
  const byTeamHours: Record<string, number> = {};

  for (const r of reports) {
    const rowHours = monthlyHoursLostForReport(r);
    monthlyHours += rowHours;
    byCategoryHours[r.category] = (byCategoryHours[r.category] ?? 0) + rowHours;
    byTeamHours[r.team] = (byTeamHours[r.team] ?? 0) + rowHours;
  }

  const monthlyCostLost = monthlyHours * hourlyRateUsd;
  const annualizedCostLost = annualizedCostFromMonthly(monthlyCostLost);
  const annualSavingsOpportunity = annualizedCostLost * ANNUAL_SAVINGS_CAPTURE_RATE;

  const sortedCategories = Object.entries(byCategoryHours).sort((a, b) => b[1] - a[1]);
  const top = sortedCategories[0];

  return {
    monthlyHoursLost: Math.round(monthlyHours),
    monthlyCostLost: Math.round(monthlyCostLost),
    annualizedCostLost: Math.round(annualizedCostLost),
    annualSavingsOpportunity: Math.round(annualSavingsOpportunity),
    reportCount: reports.length,
    topCategoryId: (top?.[0] ?? "data-entry") as FrictionCategoryId,
    topCategoryMonthlyHours: Math.round(top?.[1] ?? 0),
    byCategoryHours,
    byTeamHours,
  };
}
