import type { AppCurrencyCode } from "@/constants/currency";
import { DEFAULT_APP_CURRENCY } from "@/constants/currency";
import type { FrictionCategory, Frequency, ReportStatus, RoadmapPriorityLevel } from "@/constants/friction";
import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import {
  buildDashboardMetrics,
  calculateMonthlyCost,
  calculateMonthlyHours,
  formatCurrency,
  formatHours,
  frequencyMultiplier,
  severityMultiplier,
} from "@/lib/frictionCalculations";
import { buildRoadmapRecommendations, type CompanyRecommendationSettings } from "@/lib/recommendationEngine";
import type { DerivedRoadmapItem, FrictionReport } from "@/types";

export { CATEGORY_BASE_FIRST_STEP as CATEGORY_FIRST_STEP } from "@/lib/recommendationEngine";

function slugPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function synthesizeProblem(related: FrictionReport[], category: FrictionCategory, process: string): string {
  if (related.length === 1) {
    return related[0]!.description;
  }
  const titles = related.map((r) => r.title).slice(0, 3);
  const more = related.length > 3 ? ` (+${related.length - 3} more)` : "";
  return `${related.length} reports cluster around ${process} under ${category}: ${titles.join("; ")}${more}.`;
}

function whyItMattersText(
  related: FrictionReport[],
  monthlyHours: number,
  monthlyCost: number,
  currency: AppCurrencyCode,
): string {
  const teams = [...new Set(related.map((r) => r.team))];
  const teamPhrase = teams.length <= 2 ? teams.join(" and ") : `${teams.length} teams`;
  return (
    `${teamPhrase} lose roughly ${Math.round(monthlyHours)}h/month (~${formatCurrency(Math.round(monthlyCost), currency)}) ` +
    `to this bottleneck. Addressing it reduces rework and speeds customer-facing work.`
  );
}

/** Single status for the cluster from underlying reports (for display and filtering). */
export function deriveClusterStatus(relatedReports: FrictionReport[]): ReportStatus {
  if (!relatedReports.length) return "open";
  const statuses = relatedReports.map((r) => r.status);
  if (statuses.every((s) => s === "resolved")) return "resolved";
  if (statuses.every((s) => s === "planned")) return "planned";
  if (statuses.every((s) => s === "reviewing")) return "reviewing";
  if (statuses.some((s) => s === "open")) return "open";
  if (statuses.some((s) => s === "reviewing")) return "reviewing";
  if (statuses.some((s) => s === "planned")) return "planned";
  return "open";
}

function problemTitleForCluster(related: FrictionReport[], process: string): string {
  if (related.length === 1) return related[0]!.title;
  return `${process} (${related.length} reports)`;
}

export function roadmapPriorityScore(input: {
  monthlyCost: number;
  reportCount: number;
  avgSeverityMultiplier: number;
  avgFrequencyMultiplier: number;
}): number {
  const { monthlyCost, reportCount, avgSeverityMultiplier, avgFrequencyMultiplier } = input;
  const countBoost = 1 + 0.25 * Math.max(0, reportCount - 1);
  return monthlyCost * countBoost * avgSeverityMultiplier * (0.6 + avgFrequencyMultiplier / 10);
}

function assignPriorityLevels(scores: number[]): RoadmapPriorityLevel[] {
  const max = Math.max(...scores, 1);
  return scores.map((score) => {
    const ratio = score / max;
    if (ratio >= 0.72) return "Critical";
    if (ratio >= 0.42) return "High";
    if (ratio >= 0.18) return "Medium";
    return "Low";
  });
}

function formatFrequencyPlain(f: Frequency): string {
  if (f === "once") return "once";
  if (f === "daily") return "daily";
  if (f === "weekly") return "weekly";
  return "monthly";
}

/** Plain-language “why #1” for the top-ranked opportunity. */
export function buildWhyRankedFirstExplanation(
  item: DerivedRoadmapItem,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const n = item.relatedReports.length;
  const cost = Math.round(item.monthlyCost);
  const teams = [...new Set(item.relatedReports.map((r) => r.team))];
  const teamStr = teams.length <= 2 ? teams.join(" and ") : `${teams.length} teams`;
  const weeklyOrFaster = item.relatedReports.filter((r) => r.frequency === "daily" || r.frequency === "weekly").length;
  const sevHigh = item.relatedReports.filter((r) => r.severity === "high" || r.severity === "critical").length;

  let text = `This is ranked first because it appears in ${n} ${n === 1 ? "report" : "reports"}`;
  if (weeklyOrFaster >= Math.ceil(n / 2)) {
    text += ", many on a weekly or faster cadence";
  }
  text += `, and costs an estimated ${formatCurrency(cost, currency)} per month.`;
  if (sevHigh > 0) {
    text += ` ${sevHigh} linked ${sevHigh === 1 ? "report is" : "reports are"} high or critical severity.`;
  }
  text += ` Fixing it would reduce repeated delays across ${teamStr}.`;
  return text;
}

/** Sortable cluster row before recommendation enrichment. */
type RoadmapSortRow = {
  id: string;
  problemTitle: string;
  problem: string;
  category: FrictionCategory;
  process: string;
  relatedReports: FrictionReport[];
  monthlyHours: number;
  monthlyCost: number;
  annualCost: number;
  priorityScore: number;
  whyItMattersBase: string;
  status: ReportStatus;
};

/** Short summary for copy-to-clipboard. */
export function formatRoadmapItemCopySummary(item: DerivedRoadmapItem, currency: AppCurrencyCode = DEFAULT_APP_CURRENCY): string {
  return [
    `Problem: ${item.problemTitle}`,
    `Priority: ${item.priorityLevel}`,
    `Recommendation confidence: ${item.recommendationConfidence}`,
    `Estimated monthly cost: ${formatCurrency(Math.round(item.monthlyCost), currency)}`,
    `Estimated annual cost: ${formatCurrency(Math.round(item.annualCost), currency)}`,
    `Suggested fix: ${item.suggestedFix}`,
    `First step: ${item.firstStep}`,
    `Implementation effort: ${item.difficulty} · ${item.estimatedImplementationTime}`,
    `Suggested owner: ${item.ownerSuggestion}`,
    `Success metric: ${item.successMetric}`,
  ].join("\n");
}

/** Fuller export including taxonomy and related report lines. */
export function formatRoadmapItemExportText(
  item: DerivedRoadmapItem,
  hourlyRate: number = AVERAGE_HOURLY_COST,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const header = [
    `Problem: ${item.problemTitle}`,
    `Category: ${item.category}`,
    `Process / tool: ${item.process}`,
    `Priority: ${item.priorityLevel}`,
    `Recommendation confidence: ${item.recommendationConfidence}`,
    `Cluster status: ${item.status}`,
    `Estimated monthly cost: ${formatCurrency(Math.round(item.monthlyCost), currency)}`,
    `Estimated annual cost: ${formatCurrency(Math.round(item.annualCost), currency)}`,
    `Estimated monthly hours: ${formatHours(item.monthlyHours)}`,
    `Related reports: ${item.relatedReports.length}`,
    "",
    `Why it matters: ${item.whyItMatters}`,
    "",
    `Suggested fix: ${item.suggestedFix}`,
    "",
    `Recommended first step: ${item.firstStep}`,
    "",
    "Implementation plan:",
    item.implementationPlan,
    "",
    `Expected benefit (estimate): ${item.expectedBenefit}`,
    "",
    `Risk if ignored: ${item.riskIfIgnored}`,
    "",
    `Adoption notes: ${item.adoptionNotes}`,
    "",
    `Difficulty: ${item.difficulty}`,
    `Estimated implementation time: ${item.estimatedImplementationTime}`,
    `Suggested owner: ${item.ownerSuggestion}`,
    `Success metric: ${item.successMetric}`,
    "",
    "Pattern signals:",
    ...(item.detectedPatterns.length
      ? item.detectedPatterns.map((p) => `  - ${p.label}: ${p.narrative}`)
      : ["  - (none beyond cluster defaults)"]),
    "",
    "Related reports:",
    ...item.relatedReports.map((r) => `  - ${formatRelatedReportLine(r, hourlyRate, currency)}`),
  ];
  return header.join("\n");
}

export function formatRelatedReportLine(
  r: FrictionReport,
  hourlyRate: number = AVERAGE_HOURLY_COST,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  return `${r.title} · ${r.team} · ${formatCurrency(Math.round(calculateMonthlyCost(r, hourlyRate)), currency)}/mo · ${formatFrequencyPlain(r.frequency)} · ${r.status}`;
}

/**
 * Groups reports by category + process and builds ranked roadmap rows.
 */
export function generateRoadmapItems(
  reports: FrictionReport[],
  hourlyRate: number = AVERAGE_HOURLY_COST,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
  recommendationSettings?: CompanyRecommendationSettings,
): DerivedRoadmapItem[] {
  const buckets = new Map<string, FrictionReport[]>();
  for (const r of reports) {
    const key = `${r.category}|||${r.process}`;
    const list = buckets.get(key) ?? [];
    list.push(r);
    buckets.set(key, list);
  }

  const raw: RoadmapSortRow[] = [...buckets.entries()].map(([key, relatedReports]) => {
    const [category, process] = key.split("|||") as [FrictionCategory, string];
    const monthlyHours = relatedReports.reduce((s, r) => s + calculateMonthlyHours(r), 0);
    const monthlyCost = relatedReports.reduce((s, r) => s + calculateMonthlyCost(r, hourlyRate), 0);
    const annualCost = monthlyCost * 12;
    const avgSeverityMultiplier =
      relatedReports.reduce((s, r) => s + severityMultiplier(r.severity), 0) / relatedReports.length;
    const avgFrequencyMultiplier =
      relatedReports.reduce((s, r) => s + frequencyMultiplier(r.frequency), 0) / relatedReports.length;

    const priorityScore = roadmapPriorityScore({
      monthlyCost,
      reportCount: relatedReports.length,
      avgSeverityMultiplier,
      avgFrequencyMultiplier,
    });

    const problem = synthesizeProblem(relatedReports, category, process);
    const whyItMattersBase = whyItMattersText(relatedReports, monthlyHours, monthlyCost, currency);
    const problemTitle = problemTitleForCluster(relatedReports, process);
    const status = deriveClusterStatus(relatedReports);

    return {
      id: `roadmap-${slugPart(category)}-${slugPart(process)}`,
      problemTitle,
      problem,
      category,
      process,
      relatedReports,
      monthlyHours,
      monthlyCost,
      annualCost,
      priorityScore,
      whyItMattersBase,
      status,
    };
  });

  raw.sort((a, b) => b.priorityScore - a.priorityScore);
  const levels = assignPriorityLevels(raw.map((r) => r.priorityScore));
  const metrics = buildDashboardMetrics(reports, hourlyRate);

  return raw.map((row, i) => {
    const priorityLevel = levels[i]!;
    const rec = buildRoadmapRecommendations(
      reports,
      {
        category: row.category,
        process: row.process,
        relatedReports: row.relatedReports,
        monthlyHours: row.monthlyHours,
        monthlyCost: row.monthlyCost,
        priorityLevel,
        whyItMatters: row.whyItMattersBase,
      },
      metrics,
      recommendationSettings,
      currency,
    );
    return {
      id: row.id,
      problemTitle: row.problemTitle,
      problem: row.problem,
      category: row.category,
      process: row.process,
      relatedReports: row.relatedReports,
      monthlyHours: row.monthlyHours,
      monthlyCost: row.monthlyCost,
      annualCost: row.annualCost,
      priorityScore: row.priorityScore,
      priorityLevel,
      status: row.status,
      ...rec,
    };
  });
}
