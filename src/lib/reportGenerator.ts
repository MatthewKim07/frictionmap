import type { AppCurrencyCode } from "@/constants/currency";
import { DEFAULT_APP_CURRENCY } from "@/constants/currency";
import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import {
  buildDashboardMetrics,
  formatCurrency,
  formatHours,
  getCategoryImpactRows,
  getCriticalHighCount,
  getHighestCostProcess,
  getOpenReportCount,
  getProcessCostRanking,
  getTeamMonthlyCosts,
} from "@/lib/frictionCalculations";
import { generateRoadmapItems } from "@/lib/roadmap";
import { computeSavingsAnalytics } from "@/lib/savingsAnalytics";
import type { DashboardMetrics, DerivedRoadmapItem, FrictionReport } from "@/types";

export type BusinessImpactReportTone = "executive" | "technical" | "operations";

export interface BusinessImpactReportOptions {
  tone?: BusinessImpactReportTone;
  hourlyRate?: number;
  generatedAt?: Date;
  /** Display currency for dollar strings (no FX conversion). */
  currencyCode?: AppCurrencyCode;
}

export interface BusinessImpactReportStats {
  reportCount: number;
  openCount: number;
  critHigh: number;
  monthlyHoursLost: number;
  monthlyCostLeakage: number;
  annualizedCostLeakage: number;
  topCategoryLabel: string;
  highestProcessLabel: string;
  roadmapClusterCount: number;
  potentialTop3MonthlySavings: number;
  resolvedMonthlySavingsEstimate: number;
  remainingMonthlyLeakageEstimate: number;
  percentCostAddressed: number;
}

export interface BusinessImpactReportResult {
  markdown: string;
  stats: BusinessImpactReportStats;
  generatedAtIso: string;
}

function formatGeneratedHeading(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

export function generateExecutiveSummary(
  metrics: DashboardMetrics,
  roadmapTop: DerivedRoadmapItem | undefined,
  highestProcess: { process: string; monthlyCost: number },
  tone: BusinessImpactReportTone,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const n = metrics.reportCount;
  const hoursPhrase = formatHours(metrics.monthlyHoursLost);
  const monthly$ = formatCurrency(metrics.monthlyCostLost, currency);
  const annual$ = formatCurrency(metrics.annualizedCostLost, currency);
  const topCat = metrics.topCategory ?? "multiple categories";
  const proc =
    highestProcess.process && highestProcess.monthlyCost > 0
      ? highestProcess.process
      : roadmapTop?.process ?? "several workflow clusters";

  let lead = `FrictionMap analyzed **${n}** friction ${n === 1 ? "report" : "reports"} and identified an estimated **${hoursPhrase}** of workflow drag per month, representing approximately **${monthly$}** in monthly cost leakage and **${annual$}** annualized.`;

  const catProc = `The largest source of friction by category is **${topCat}**, while the highest-cost process cluster is **${proc}**.`;

  if (tone === "executive") {
    return `${lead}\n\n${catProc}\n\nThese figures translate directly into budget risk and delivery delays leaders can prioritize against other initiatives.`;
  }
  if (tone === "technical") {
    return `${lead}\n\n${catProc}\n\nThe clusters point to specific systems and handoffs where automation, integrations, or clearer contracts between tools would reduce repeated manual work.`;
  }
  return `${lead}\n\n${catProc}\n\nOperational follow-through — clear owners, queues, and runbooks — is what turns these estimates into sustained time back for teams.`;
}

export function generateTopBottlenecksSection(roadmapItems: DerivedRoadmapItem[], currency: AppCurrencyCode = DEFAULT_APP_CURRENCY): string {
  const top = roadmapItems.slice(0, 3);
  if (!top.length) return "## Top Bottlenecks\n\n_No clustered bottlenecks yet._\n";
  const lines = top.map(
    (item, i) =>
      `${i + 1}. **${item.process}** — ${formatCurrency(Math.round(item.monthlyCost), currency)}/month (${item.priorityLevel} priority, ${item.relatedReports.length} related ${item.relatedReports.length === 1 ? "report" : "reports"})`,
  );
  return `## Top Bottlenecks\n\n${lines.join("\n")}\n`;
}

export function generateRecommendedFixesSection(roadmapItems: DerivedRoadmapItem[]): string {
  const top = roadmapItems.slice(0, 3);
  if (!top.length) return "## Recommended Fixes\n\n_No roadmap fixes available yet._\n";
  const lines = top.map((item, i) => {
    const conf = item.recommendationConfidence;
    return [
      `### ${i + 1}. ${item.problemTitle} (${item.process})`,
      `- **Confidence:** ${conf}`,
      `- **Suggested fix:** ${item.suggestedFix.trim()}`,
      `- **First step:** ${item.firstStep.trim()}`,
      `- **Expected benefit (estimate):** ${item.expectedBenefit.replace(/\*\*/g, "")}`,
      `- **Success metric:** ${item.successMetric}`,
      "",
    ].join("\n");
  });
  return `## Recommended Fixes\n\n${lines.join("\n")}\n`;
}

export function generateNextStepsSection(
  roadmapItems: DerivedRoadmapItem[],
  tone: BusinessImpactReportTone,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const first = roadmapItems[0];
  const start = first
    ? `Start with **${first.process}** (${formatCurrency(Math.round(first.monthlyCost), currency)}/month) when aligning owners.`
    : "Start with the highest monthly-cost cluster when assigning owners.";

  if (tone === "executive") {
    return `## Suggested Next Steps\n\n- Review the top 3 bottlenecks with team leads and finance.\n- ${start}\n- Assign an executive sponsor and delivery owner per fix opportunity.\n- Re-run FrictionMap after changes ship to validate recovered hours and dollars.\n`;
  }
  if (tone === "technical") {
    return `## Suggested Next Steps\n\n- Trace the top clusters to concrete systems, APIs, and data flows.\n- ${start}\n- Prototype the smallest integration or automation that removes repeated copy-paste.\n- Instrument before/after time-on-task where possible; re-import reports to FrictionMap.\n`;
  }
  return `## Suggested Next Steps\n\n- Stand up a short weekly triage for open friction reports.\n- ${start}\n- Document owners, SLAs, and escalation paths for each top cluster.\n- Close the loop with reporters when fixes land; refresh FrictionMap for new drag.\n`;
}

function generateKeyMetricsSection(
  metrics: DashboardMetrics,
  openCount: number,
  critHigh: number,
  highestProcess: { process: string; monthlyCost: number },
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const topCat = metrics.topCategory ?? "—";
  const procLine =
    highestProcess.process && highestProcess.monthlyCost > 0
      ? `- Highest-cost process: **${highestProcess.process}** (${formatCurrency(Math.round(highestProcess.monthlyCost), currency)}/month)\n`
      : "- Highest-cost process: **—** (insufficient data)\n";
  return `## Key Metrics\n\n- Monthly hours lost: **${formatHours(metrics.monthlyHoursLost)}**\n- Monthly cost leakage: **${formatCurrency(metrics.monthlyCostLost, currency)}**\n- Annualized cost leakage: **${formatCurrency(metrics.annualizedCostLost, currency)}**\n- Reports analyzed: **${metrics.reportCount}**\n- Open reports: **${openCount}**\n- Top friction category: **${topCat}**\n${procLine}- Critical/high severity reports: **${critHigh}**\n`;
}

function generateTopCategoriesSection(reports: FrictionReport[], hourlyRate: number, currency: AppCurrencyCode = DEFAULT_APP_CURRENCY): string {
  const rows = getCategoryImpactRows(reports, hourlyRate).slice(0, 5);
  if (!rows.length) return "## Top Friction Categories\n\n_No category data._\n";
  const lines = rows.map(
    (r, i) =>
      `${i + 1}. **${r.category}** — ${formatHours(r.monthlyHours)} · ${formatCurrency(r.monthlyCost, currency)}/month`,
  );
  return `## Top Friction Categories\n\n${lines.join("\n")}\n`;
}

function generateTeamsProcessesSection(reports: FrictionReport[], hourlyRate: number, currency: AppCurrencyCode = DEFAULT_APP_CURRENCY): string {
  const processes = getProcessCostRanking(reports, hourlyRate).slice(0, 5);
  const teams = getTeamMonthlyCosts(reports, hourlyRate).filter((t) => t.monthlyCost > 0).slice(0, 5);
  const procLines = processes.length
    ? processes.map((p) => `- **${p.process}** — ${formatCurrency(p.monthlyCost, currency)}/month (${p.reportCount} reports)`).join("\n")
    : "_No process rollup._";
  const teamLines = teams.length
    ? teams.map((t) => `- **${t.team}** — ${formatCurrency(t.monthlyCost, currency)}/month`).join("\n")
    : "_No team rollup._";
  return `## Highest-Cost Processes and Teams\n\n### Processes\n\n${procLines}\n\n### Teams\n\n${teamLines}\n`;
}

function generateSavingsSection(metrics: DashboardMetrics, currency: AppCurrencyCode = DEFAULT_APP_CURRENCY): string {
  return `## Estimated Savings Opportunity\n\nIf the modeled drag were fully addressed, teams could recover up to **${formatCurrency(metrics.monthlyCostLost, currency)}** per month, or about **${formatCurrency(metrics.annualizedCostLost, currency)}** annualized, based on current reports and the configured hourly rate.\n`;
}

function generateSavingsTrackingSection(
  savings: ReturnType<typeof computeSavingsAnalytics>,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): string {
  const top3 = formatCurrency(savings.potentialTop3MonthlySavings, currency);
  const resolved = formatCurrency(savings.resolvedMonthlyCost, currency);
  const remaining = formatCurrency(savings.remainingOpenMonthlyCost, currency);
  const crit = formatCurrency(savings.potentialCriticalMonthlySavings, currency);
  return [
    "## Savings tracking (estimated)",
    "",
    "_Figures below are directional models from submitted friction reports and roadmap clusters — not audited financial statements._",
    "",
    `- **Potential savings (top 3 roadmap clusters):** ~${top3}/month if those bottlenecks were fully resolved.`,
    `- **Potential savings (Critical-ranked clusters only):** ~${crit}/month under the same assumption.`,
    `- **Resolved savings estimate:** ~${resolved}/month attributed to reports currently marked **Resolved** (${savings.resolvedReportCount} ${savings.resolvedReportCount === 1 ? "report" : "reports"}).`,
    `- **Remaining open leakage estimate:** ~${remaining}/month from non-resolved reports in this export.`,
    `- **Share of modeled cost marked resolved:** ~${savings.percentCostAddressed}% (resolved estimate ÷ total modeled monthly leakage).`,
    "",
    "Use this block to prioritize operational fixes and to sanity-check whether resolved work is showing up in the data.",
    "",
  ].join("\n");
}

/**
 * Builds a markdown Business Impact Report from live reports (no fabricated data).
 * Returns `null` when there are no reports.
 */
export function generateBusinessImpactReport(
  reports: FrictionReport[],
  options: BusinessImpactReportOptions = {},
): BusinessImpactReportResult | null {
  if (!reports.length) return null;

  const hourlyRate = options.hourlyRate ?? AVERAGE_HOURLY_COST;
  const tone = options.tone ?? "executive";
  const generatedAt = options.generatedAt ?? new Date();
  const currency = options.currencyCode ?? DEFAULT_APP_CURRENCY;

  const metrics = buildDashboardMetrics(reports, hourlyRate);
  const openCount = getOpenReportCount(reports);
  const critHigh = getCriticalHighCount(reports);
  const highestProcess = getHighestCostProcess(reports);
  const roadmapItems = generateRoadmapItems(reports, hourlyRate, currency, undefined);
  const roadmapTop = roadmapItems[0];
  const savingsModel = computeSavingsAnalytics(reports, hourlyRate, roadmapItems);

  const stats: BusinessImpactReportStats = {
    reportCount: metrics.reportCount,
    openCount,
    critHigh,
    monthlyHoursLost: metrics.monthlyHoursLost,
    monthlyCostLeakage: metrics.monthlyCostLost,
    annualizedCostLeakage: metrics.annualizedCostLost,
    topCategoryLabel: metrics.topCategory ?? "—",
    highestProcessLabel: highestProcess.process || "—",
    roadmapClusterCount: roadmapItems.length,
    potentialTop3MonthlySavings: savingsModel.potentialTop3MonthlySavings,
    resolvedMonthlySavingsEstimate: savingsModel.resolvedMonthlyCost,
    remainingMonthlyLeakageEstimate: savingsModel.remainingOpenMonthlyCost,
    percentCostAddressed: savingsModel.percentCostAddressed,
  };

  const exec = generateExecutiveSummary(metrics, roadmapTop, highestProcess, tone, currency);
  const keyMetrics = generateKeyMetricsSection(metrics, openCount, critHigh, highestProcess, currency);
  const categories = generateTopCategoriesSection(reports, hourlyRate, currency);
  const teamsProc = generateTeamsProcessesSection(reports, hourlyRate, currency);
  const bottlenecks = generateTopBottlenecksSection(roadmapItems, currency);
  const fixes = generateRecommendedFixesSection(roadmapItems);
  const savings = generateSavingsSection(metrics, currency);
  const savingsTracking = generateSavingsTrackingSection(savingsModel, currency);
  const next = generateNextStepsSection(roadmapItems, tone, currency);

  const markdown = [
    "# FrictionMap Business Impact Report",
    "",
    `_Generated: ${formatGeneratedHeading(generatedAt)}_`,
    "",
    "## Executive Summary",
    "",
    exec,
    "",
    keyMetrics,
    "",
    categories,
    "",
    teamsProc,
    "",
    bottlenecks,
    "",
    fixes,
    "",
    savings,
    "",
    savingsTracking,
    "",
    next,
  ].join("\n");

  return {
    markdown,
    stats,
    generatedAtIso: generatedAt.toISOString(),
  };
}
