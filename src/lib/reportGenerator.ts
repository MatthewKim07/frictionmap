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
import type { DashboardMetrics, DerivedRoadmapItem, FrictionReport } from "@/types";

export type BusinessImpactReportTone = "executive" | "technical" | "operations";

export interface BusinessImpactReportOptions {
  tone?: BusinessImpactReportTone;
  hourlyRate?: number;
  generatedAt?: Date;
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
): string {
  const n = metrics.reportCount;
  const hoursPhrase = formatHours(metrics.monthlyHoursLost);
  const monthly$ = formatCurrency(metrics.monthlyCostLost);
  const annual$ = formatCurrency(metrics.annualizedCostLost);
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

export function generateTopBottlenecksSection(roadmapItems: DerivedRoadmapItem[]): string {
  const top = roadmapItems.slice(0, 3);
  if (!top.length) return "## Top Bottlenecks\n\n_No clustered bottlenecks yet._\n";
  const lines = top.map(
    (item, i) =>
      `${i + 1}. **${item.process}** — ${formatCurrency(Math.round(item.monthlyCost))}/month (${item.priorityLevel} priority, ${item.relatedReports.length} related ${item.relatedReports.length === 1 ? "report" : "reports"})`,
  );
  return `## Top Bottlenecks\n\n${lines.join("\n")}\n`;
}

export function generateRecommendedFixesSection(roadmapItems: DerivedRoadmapItem[]): string {
  const top = roadmapItems.slice(0, 3);
  if (!top.length) return "## Recommended Fixes\n\n_No roadmap fixes available yet._\n";
  const lines = top.map((item, i) => `${i + 1}. ${item.suggestedFix.trim()}`);
  return `## Recommended Fixes\n\n${lines.join("\n\n")}\n`;
}

export function generateNextStepsSection(
  roadmapItems: DerivedRoadmapItem[],
  tone: BusinessImpactReportTone,
): string {
  const first = roadmapItems[0];
  const start = first
    ? `Start with **${first.process}** (${formatCurrency(Math.round(first.monthlyCost))}/month) when aligning owners.`
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
): string {
  const topCat = metrics.topCategory ?? "—";
  const procLine =
    highestProcess.process && highestProcess.monthlyCost > 0
      ? `- Highest-cost process: **${highestProcess.process}** (${formatCurrency(Math.round(highestProcess.monthlyCost))}/month)\n`
      : "- Highest-cost process: **—** (insufficient data)\n";
  return `## Key Metrics\n\n- Monthly hours lost: **${formatHours(metrics.monthlyHoursLost)}**\n- Monthly cost leakage: **${formatCurrency(metrics.monthlyCostLost)}**\n- Annualized cost leakage: **${formatCurrency(metrics.annualizedCostLost)}**\n- Reports analyzed: **${metrics.reportCount}**\n- Open reports: **${openCount}**\n- Top friction category: **${topCat}**\n${procLine}- Critical/high severity reports: **${critHigh}**\n`;
}

function generateTopCategoriesSection(reports: FrictionReport[], hourlyRate: number): string {
  const rows = getCategoryImpactRows(reports, hourlyRate).slice(0, 5);
  if (!rows.length) return "## Top Friction Categories\n\n_No category data._\n";
  const lines = rows.map(
    (r, i) =>
      `${i + 1}. **${r.category}** — ${formatHours(r.monthlyHours)} · ${formatCurrency(r.monthlyCost)}/month`,
  );
  return `## Top Friction Categories\n\n${lines.join("\n")}\n`;
}

function generateTeamsProcessesSection(reports: FrictionReport[], hourlyRate: number): string {
  const processes = getProcessCostRanking(reports, hourlyRate).slice(0, 5);
  const teams = getTeamMonthlyCosts(reports, hourlyRate).filter((t) => t.monthlyCost > 0).slice(0, 5);
  const procLines = processes.length
    ? processes.map((p) => `- **${p.process}** — ${formatCurrency(p.monthlyCost)}/month (${p.reportCount} reports)`).join("\n")
    : "_No process rollup._";
  const teamLines = teams.length
    ? teams.map((t) => `- **${t.team}** — ${formatCurrency(t.monthlyCost)}/month`).join("\n")
    : "_No team rollup._";
  return `## Highest-Cost Processes and Teams\n\n### Processes\n\n${procLines}\n\n### Teams\n\n${teamLines}\n`;
}

function generateSavingsSection(metrics: DashboardMetrics): string {
  return `## Estimated Savings Opportunity\n\nIf the modeled drag were fully addressed, teams could recover up to **${formatCurrency(metrics.monthlyCostLost)}** per month, or about **${formatCurrency(metrics.annualizedCostLost)}** annualized, based on current reports and the configured hourly rate.\n`;
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

  const metrics = buildDashboardMetrics(reports, hourlyRate);
  const openCount = getOpenReportCount(reports);
  const critHigh = getCriticalHighCount(reports);
  const highestProcess = getHighestCostProcess(reports);
  const roadmapItems = generateRoadmapItems(reports, hourlyRate);
  const roadmapTop = roadmapItems[0];

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
  };

  const exec = generateExecutiveSummary(metrics, roadmapTop, highestProcess, tone);
  const keyMetrics = generateKeyMetricsSection(metrics, openCount, critHigh, highestProcess);
  const categories = generateTopCategoriesSection(reports, hourlyRate);
  const teamsProc = generateTeamsProcessesSection(reports, hourlyRate);
  const bottlenecks = generateTopBottlenecksSection(roadmapItems);
  const fixes = generateRecommendedFixesSection(roadmapItems);
  const savings = generateSavingsSection(metrics);
  const next = generateNextStepsSection(roadmapItems, tone);

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
    next,
  ].join("\n");

  return {
    markdown,
    stats,
    generatedAtIso: generatedAt.toISOString(),
  };
}
