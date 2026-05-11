import type { FrictionCategory, RoadmapPriorityLevel } from "@/constants/friction";
import {
  calculateMonthlyCost,
  calculateMonthlyHours,
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
    `${teamPhrase} lose roughly ${Math.round(monthlyHours)}h/month (~$${Math.round(monthlyCost).toLocaleString()}) ` +
    `to this bottleneck. Addressing it reduces rework and speeds customer-facing work.`
  );
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
    const suggestedFix = CATEGORY_SUGGESTED_FIX[category];
    const customSuggestion = relatedReports.map((r) => r.suggestion).find((s) => s.trim().length > 0);
    const whyItMatters = whyItMattersText(relatedReports, monthlyHours, monthlyCost);

    const item: DerivedRoadmapItem = {
      id: `roadmap-${slugPart(category)}-${slugPart(process)}`,
      problem,
      category,
      process,
      relatedReports,
      monthlyHours,
      monthlyCost,
      annualCost,
      priorityScore,
      priorityLevel: "Low", // filled after scoring pass
      whyItMatters,
      suggestedFix: customSuggestion?.trim() ? customSuggestion : suggestedFix,
      status: "open",
    };
    return item;
  });

  raw.sort((a, b) => b.priorityScore - a.priorityScore);
  const levels = assignPriorityLevels(raw.map((r) => r.priorityScore));
  return raw.map((item, i) => ({ ...item, priorityLevel: levels[i]! }));
}
