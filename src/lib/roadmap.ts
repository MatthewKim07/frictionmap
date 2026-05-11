import type { FrictionCategory, Frequency, ReportStatus, RoadmapPriorityLevel } from "@/constants/friction";
import {
  calculateMonthlyCost,
  calculateMonthlyHours,
  formatCurrency,
  formatHours,
  frequencyMultiplier,
  severityMultiplier,
} from "@/lib/frictionCalculations";
import type { DerivedRoadmapItem, FrictionReport } from "@/types";

const CATEGORY_SUGGESTED_FIX: Record<FrictionCategory, string> = {
  "Access delay":
    "Create a self-service access request flow with predefined approval rules and automatic routing.",
  "Approval bottleneck":
    "Define approval thresholds so low-risk requests can be auto-approved or batched.",
  "Manual data entry":
    "Replace repeated copy-paste work with an API integration, CSV import, or scheduled automation.",
  "Missing documentation":
    "Create a short owner-approved runbook with setup steps, known issues, and escalation paths.",
  "Duplicate work":
    "Create a searchable internal project registry to prevent teams from rebuilding existing work.",
  "Tool confusion":
    "Consolidate tool guidance into a single source of truth with clear ownership.",
  "Waiting on another team":
    "Add service-level expectations and a shared request queue for cross-team dependencies.",
  "Rework or error correction":
    "Add checklist validation and clearer handoff requirements before work moves downstream.",
};

/** Rule-based “do this first” line per category. */
export const CATEGORY_FIRST_STEP: Record<FrictionCategory, string> = {
  "Access delay":
    "List the top 3 access requests causing delays and define who can approve each one.",
  "Approval bottleneck":
    "Identify which approvals are low-risk and can be auto-approved or batched weekly.",
  "Manual data entry":
    "Document the repeated fields being copied and check whether both systems support CSV import or API access.",
  "Missing documentation":
    "Create a one-page runbook with owner, setup steps, common issues, and escalation path.",
  "Duplicate work":
    "Search for existing trackers or tools and assign one owner to consolidate them.",
  "Tool confusion":
    "Create a single source-of-truth page explaining which tool to use for which task.",
  "Waiting on another team":
    "Create a shared request queue with expected response times.",
  "Rework or error correction":
    "Add a checklist before handoff to catch missing or unclear information earlier.",
};

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
): string {
  const teams = [...new Set(related.map((r) => r.team))];
  const teamPhrase = teams.length <= 2 ? teams.join(" and ") : `${teams.length} teams`;
  return (
    `${teamPhrase} lose roughly ${Math.round(monthlyHours)}h/month (~${formatCurrency(Math.round(monthlyCost))}) ` +
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
export function buildWhyRankedFirstExplanation(item: DerivedRoadmapItem): string {
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
  text += `, and costs an estimated ${formatCurrency(cost)} per month.`;
  if (sevHigh > 0) {
    text += ` ${sevHigh} linked ${sevHigh === 1 ? "report is" : "reports are"} high or critical severity.`;
  }
  text += ` Fixing it would reduce repeated delays across ${teamStr}.`;
  return text;
}

/** Short summary for copy-to-clipboard. */
export function formatRoadmapItemCopySummary(item: DerivedRoadmapItem): string {
  return [
    `Problem: ${item.problemTitle}`,
    `Priority: ${item.priorityLevel}`,
    `Estimated monthly cost: ${formatCurrency(Math.round(item.monthlyCost))}`,
    `Estimated annual cost: ${formatCurrency(Math.round(item.annualCost))}`,
    `Suggested fix: ${item.suggestedFix}`,
    `First step: ${item.firstStep}`,
  ].join("\n");
}

/** Fuller export including taxonomy and related report lines. */
export function formatRoadmapItemExportText(item: DerivedRoadmapItem): string {
  const header = [
    `Problem: ${item.problemTitle}`,
    `Category: ${item.category}`,
    `Process / tool: ${item.process}`,
    `Priority: ${item.priorityLevel}`,
    `Cluster status: ${item.status}`,
    `Estimated monthly cost: ${formatCurrency(Math.round(item.monthlyCost))}`,
    `Estimated annual cost: ${formatCurrency(Math.round(item.annualCost))}`,
    `Estimated monthly hours: ${formatHours(item.monthlyHours)}`,
    `Related reports: ${item.relatedReports.length}`,
    "",
    `Why it matters: ${item.whyItMatters}`,
    "",
    `Suggested fix: ${item.suggestedFix}`,
    "",
    `Recommended first step: ${item.firstStep}`,
    "",
    "Related reports:",
    ...item.relatedReports.map((r) => `  - ${formatRelatedReportLine(r)}`),
  ];
  return header.join("\n");
}

export function formatRelatedReportLine(r: FrictionReport): string {
  return `${r.title} · ${r.team} · ${formatCurrency(Math.round(calculateMonthlyCost(r)))}/mo · ${formatFrequencyPlain(r.frequency)} · ${r.status}`;
}

/**
 * Groups reports by category + process and builds ranked roadmap rows.
 */
export function generateRoadmapItems(reports: FrictionReport[]): DerivedRoadmapItem[] {
  const buckets = new Map<string, FrictionReport[]>();
  for (const r of reports) {
    const key = `${r.category}|||${r.process}`;
    const list = buckets.get(key) ?? [];
    list.push(r);
    buckets.set(key, list);
  }

  const raw = [...buckets.entries()].map(([key, relatedReports]) => {
    const [category, process] = key.split("|||") as [FrictionCategory, string];
    const monthlyHours = relatedReports.reduce((s, r) => s + calculateMonthlyHours(r), 0);
    const monthlyCost = relatedReports.reduce((s, r) => s + calculateMonthlyCost(r), 0);
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
    const suggestedTemplate = CATEGORY_SUGGESTED_FIX[category];
    const customSuggestion = relatedReports.map((r) => r.suggestion).find((s) => s.trim().length > 0);
    const whyItMatters = whyItMattersText(relatedReports, monthlyHours, monthlyCost);
    const problemTitle = problemTitleForCluster(relatedReports, process);
    const firstStep = CATEGORY_FIRST_STEP[category];
    const status = deriveClusterStatus(relatedReports);

    const item: DerivedRoadmapItem = {
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
      priorityLevel: "Low",
      whyItMatters,
      suggestedFix: customSuggestion?.trim() ? customSuggestion : suggestedTemplate,
      firstStep,
      status,
    };
    return item;
  });

  raw.sort((a, b) => b.priorityScore - a.priorityScore);
  const levels = assignPriorityLevels(raw.map((r) => r.priorityScore));
  return raw.map((item, i) => ({ ...item, priorityLevel: levels[i]! }));
}
