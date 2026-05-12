/**
 * Rule-based operational recommendations for roadmap clusters and reports.
 * No external AI — patterns + category playbooks only.
 */

import type { AppCurrencyCode } from "@/constants/currency";
import { DEFAULT_APP_CURRENCY } from "@/constants/currency";
import type { FrictionCategory, RoadmapPriorityLevel, Team } from "@/constants/friction";
import { formatCurrency, formatHours } from "@/lib/frictionCalculations";
import type {
  DashboardMetrics,
  DerivedRoadmapItem,
  FrictionReport,
  RecommendationConfidence,
  RecommendationDifficulty,
  RoadmapDetectedPattern,
} from "@/types";

export type { RecommendationConfidence, RecommendationDifficulty, RoadmapDetectedPattern } from "@/types";

export interface CompanyRecommendationSettings {
  /** Optional label for copy, e.g. "Acme Corp" */
  organizationLabel?: string;
}

/** Per-category operational depth (immediate → long-term). */
export interface CategoryRecommendationPlaybook {
  immediate: string;
  mediumTerm: string;
  longTerm: string;
  defaultOwner: string;
  defaultSuccessMetric: string;
}

export const CATEGORY_PLAYBOOKS: Record<FrictionCategory, CategoryRecommendationPlaybook> = {
  "Access delay": {
    immediate:
      "Stand up a 15-minute triage with IT/security to list the top recurring access types and current approvers.",
    mediumTerm:
      "Pilot a self-service request form with predefined risk tiers and automatic routing for standard access.",
    longTerm:
      "Codify access patterns in policy: default entitlements by role, time-bound elevated access, and quarterly access reviews.",
    defaultOwner: "IT or security lead paired with the affected team’s engineering manager",
    defaultSuccessMetric:
      "Median time from request to granted access drops; repeat access requests for the same system fall week over week.",
  },
  "Approval bottleneck": {
    immediate:
      "Export the last 20 approvals for this workflow and tag each as low / medium / high business risk.",
    mediumTerm:
      "Introduce thresholds so low-risk items batch weekly or auto-approve; keep human review only where policy requires it.",
    longTerm:
      "Publish approval SLAs, backup approvers, and escalation paths so work is never blocked on a single person.",
    defaultOwner: "Finance or operations manager who owns the policy, with legal/compliance sign-off where needed",
    defaultSuccessMetric:
      "Time waiting in approval status decreases; fewer emergency escalations and fewer duplicate requests for the same decision.",
  },
  "Manual data entry": {
    immediate:
      "Shadow one full cycle of the copy-paste path and list every field, source system, and destination.",
    mediumTerm:
      "Pilot CSV export/import or a small scripted sync between the two systems; measure errors and time saved.",
    longTerm:
      "Replace brittle spreadsheets with an API-backed integration or governed data product owned by one team.",
    defaultOwner: "Engineering or data lead with the business process owner",
    defaultSuccessMetric:
      "Manual touches per record drop; error rate and rework tickets tied to this process trend down.",
  },
  "Tool confusion": {
    immediate:
      "Interview three people doing the work and document which tool they use today and why.",
    mediumTerm:
      "Publish a one-page “which tool when” guide with examples and deprecate overlapping tools where safe.",
    longTerm:
      "Rationalize licenses and workflows so one primary system owns each job type; train on transitions.",
    defaultOwner: "Product or IT enablement lead with input from team leads",
    defaultSuccessMetric:
      "Fewer “wrong system” mistakes; faster onboarding; reduced duplicate work across tools.",
  },
  "Missing documentation": {
    immediate:
      "Draft a one-page runbook: purpose, prerequisites, step-by-step, known failures, and who to page.",
    mediumTerm:
      "Add documentation to the definition of done for changes touching this area; link runbooks from the primary tool.",
    longTerm:
      "Institute lightweight doc reviews during incidents and postmortems so knowledge compounds instead of living in chat.",
    defaultOwner: "Team lead or on-call primary for the affected service or process",
    defaultSuccessMetric:
      "Mean time to resolve repeat incidents drops; new hires can execute the flow without shoulder-tapping seniors.",
  },
  "Duplicate work": {
    immediate:
      "Search internal wikis, drives, and Slack for similar artifacts; list what already exists and who owns it.",
    mediumTerm:
      "Pick one canonical tracker or dashboard and migrate stakeholders; retire redundant copies with a sunset date.",
    longTerm:
      "Add a lightweight intake so new duplicate initiatives are caught in planning rather than after launch.",
    defaultOwner: "Program or operations manager with authority to pick the single source of truth",
    defaultSuccessMetric:
      "One authoritative artifact per workflow; hours spent reconciling conflicting versions decrease.",
  },
  "Waiting on another team": {
    immediate:
      "Map request types, volumes, and current response channels between the two teams.",
    mediumTerm:
      "Introduce a shared queue with agreed response-time targets and a visible backlog for both sides.",
    longTerm:
      "Where volume is high, embed a liaison or rotate ownership so dependencies do not become silent blockers.",
    defaultOwner: "Managers of both teams co-owning the SLA",
    defaultSuccessMetric:
      "Queue age and handoff wait time decrease; fewer status pings and fewer blocked work items.",
  },
  "Rework or error correction": {
    immediate:
      "Replay the last three defects: what was missing at handoff and where could a checklist have caught it?",
    mediumTerm:
      "Add mandatory handoff fields and a short peer review before work leaves the originating team.",
    longTerm:
      "Instrument quality gates in the tool chain so systemic rework shows up in metrics, not only anecdotes.",
    defaultOwner: "Engineering or delivery lead with quality/process partner",
    defaultSuccessMetric:
      "Rework rate and reopened tickets for this handoff path decrease; lead time becomes more predictable.",
  },
};

/** Base suggested fix lines (aligned with roadmap legacy templates; engine enriches). */
export const CATEGORY_BASE_SUGGESTED_FIX: Record<FrictionCategory, string> = {
  "Access delay":
    "Create a self-service access request flow with predefined approval rules and automatic routing.",
  "Approval bottleneck":
    "Define approval thresholds so low-risk requests can be auto-approved or batched.",
  "Manual data entry":
    "Replace repeated copy-paste work with an API integration, CSV import, or scheduled automation.",
  "Tool confusion":
    "Consolidate tool guidance into a single source of truth with clear ownership.",
  "Missing documentation":
    "Create a short owner-approved runbook with setup steps, known issues, and escalation paths.",
  "Duplicate work":
    "Create a searchable internal project registry to prevent teams from rebuilding existing work.",
  "Waiting on another team":
    "Add service-level expectations and a shared request queue for cross-team dependencies.",
  "Rework or error correction":
    "Add checklist validation and clearer handoff requirements before work moves downstream.",
};

export const CATEGORY_BASE_FIRST_STEP: Record<FrictionCategory, string> = {
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

export type DetectedPattern = RoadmapDetectedPattern;

function uniqueTeams(reports: FrictionReport[]): Team[] {
  return [...new Set(reports.map((r) => r.team))];
}

function countByProcess(allReports: FrictionReport[], process: string): number {
  return allReports.filter((r) => r.process === process).length;
}

function countOpenHighSeverity(allReports: FrictionReport[]): number {
  return allReports.filter(
    (r) => r.status !== "resolved" && (r.severity === "high" || r.severity === "critical"),
  ).length;
}

function teamReportCounts(allReports: FrictionReport[]): Map<Team, number> {
  const m = new Map<Team, number>();
  for (const r of allReports) {
    m.set(r.team, (m.get(r.team) ?? 0) + 1);
  }
  return m;
}

/**
 * Detect cross-cutting patterns using the full report set plus the cluster context.
 */
export function detectPatterns(
  allReports: FrictionReport[],
  relatedReports: FrictionReport[],
  category: FrictionCategory,
  process: string,
): RoadmapDetectedPattern[] {
  const patterns: RoadmapDetectedPattern[] = [];
  const teams = uniqueTeams(relatedReports);
  const processReportsAllTeams = allReports.filter((r) => r.process === process);
  const processTeamCount = new Set(processReportsAllTeams.map((r) => r.team)).size;

  if (processTeamCount >= 2 && relatedReports.length >= 1) {
    patterns.push({
      id: "cross_functional_process",
      label: "Cross-team process",
      narrative:
        "This is cross-functional: assign one process owner instead of letting each team solve it separately so standards stay aligned.",
    });
  }

  const freqHigh = relatedReports.filter((r) => r.frequency === "daily" || r.frequency === "weekly").length;
  const sevLowish = relatedReports.filter((r) => r.severity === "low" || r.severity === "medium").length;
  if (relatedReports.length > 0 && freqHigh >= Math.ceil(relatedReports.length * 0.6) && sevLowish >= Math.ceil(relatedReports.length * 0.6)) {
    patterns.push({
      id: "high_frequency_moderate_severity",
      label: "High cadence, moderate severity",
      narrative:
        "High frequency with moderate per-event severity usually means grind, not drama — small automation or guardrails often pay back quickly.",
    });
  }

  const freqLow = relatedReports.filter((r) => r.frequency === "once" || r.frequency === "monthly").length;
  const sevCritical = relatedReports.filter((r) => r.severity === "critical").length;
  const sevHigh = relatedReports.filter((r) => r.severity === "high").length;
  if (
    relatedReports.length > 0 &&
    (sevCritical >= 1 || sevHigh >= Math.ceil(relatedReports.length * 0.5)) &&
    freqLow >= Math.ceil(relatedReports.length * 0.5)
  ) {
    patterns.push({
      id: "low_frequency_high_stakes",
      label: "Lower cadence, higher stakes",
      narrative:
        "Each occurrence is expensive or risky even if rare — prioritize durable controls and clear ownership over quick hacks.",
    });
  }

  if (category === "Missing documentation" && relatedReports.length >= 2) {
    patterns.push({
      id: "repeated_documentation_gap",
      label: "Repeated documentation gap",
      narrative:
        "Multiple reports point to documentation debt — prioritize a runbook before adding more features; operational risk is knowledge loss.",
    });
  }

  if (category === "Duplicate work" && teams.length >= 2) {
    patterns.push({
      id: "duplicate_work_across_teams",
      label: "Duplicate work across teams",
      narrative:
        "Duplicate effort spans teams — pick one canonical owner and artifact before parallel trackers diverge further.",
    });
  }

  if (teams.length === 1 && relatedReports.length >= 3) {
    patterns.push({
      id: "single_team_hotspot",
      label: "Concentrated on one team",
      narrative: `Most signal is concentrated in ${teams[0]} — empower that team’s lead to drive the fix with light cross-team coordination.`,
    });
  }

  const orgWideProcess = countByProcess(allReports, process);
  if (orgWideProcess >= 4 && relatedReports.length >= 2) {
    patterns.push({
      id: "organization_wide_process_load",
      label: "Heavy process load",
      narrative: `Many reports across the dataset involve “${process}” — treat improvements here as organization-wide leverage, not a one-off.`,
    });
  }

  const unresolvedHighInCluster = relatedReports.filter(
    (r) => r.status !== "resolved" && (r.severity === "high" || r.severity === "critical"),
  ).length;
  if (unresolvedHighInCluster >= 2) {
    patterns.push({
      id: "unresolved_high_severity_cluster",
      label: "Unresolved high-severity items",
      narrative:
        "Several high-severity items are still open — add a time-bound triage and interim mitigation so risk does not linger in the backlog.",
    });
  }

  if (category === "Manual data entry" && relatedReports.some((r) => r.frequency === "daily")) {
    patterns.push({
      id: "daily_manual_entry",
      label: "Daily manual work",
      narrative:
        "This is a strong automation candidate because it happens daily and likely touches predictable, repeated fields.",
    });
  }

  if (category === "Missing documentation" && relatedReports.some((r) => r.severity === "high" || r.severity === "critical")) {
    patterns.push({
      id: "docs_with_high_severity",
      label: "Documentation gap with high severity",
      narrative:
        "Missing documentation pairs with high severity — prioritize a runbook before adding more features; the operational risk is knowledge loss and slow incident response.",
    });
  }

  const teamCounts = teamReportCounts(allReports);
  const dominantTeam = teams.length === 1 ? teams[0] : null;
  if (dominantTeam && (teamCounts.get(dominantTeam) ?? 0) >= Math.max(5, Math.ceil(allReports.length * 0.35))) {
    patterns.push({
      id: "many_reports_one_team_org",
      label: "Organization load on one team",
      narrative: `${dominantTeam} carries a large share of overall friction reports — pair roadmap fixes with capacity and prioritization support for that team.`,
    });
  }

  if (countOpenHighSeverity(allReports) >= 5 && unresolvedHighInCluster >= 1) {
    patterns.push({
      id: "org_wide_severity_debt",
      label: "Broad severity debt",
      narrative:
        "The organization has many unresolved high-severity reports — leadership review may be needed so fixes are funded and sequenced.",
    });
  }

  // Dedupe by id (first wins)
  const seen = new Set<string>();
  return patterns.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function computeConfidence(
  relatedReports: FrictionReport[],
  patterns: RoadmapDetectedPattern[],
): RecommendationConfidence {
  const n = relatedReports.length;
  const teams = uniqueTeams(relatedReports).length;
  let score = 0;
  if (n >= 4) score += 3;
  else if (n >= 2) score += 2;
  else score += 1;
  if (teams >= 3) score += 2;
  else if (teams >= 2) score += 1;
  score += Math.min(2, patterns.length);
  const hi = relatedReports.filter((r) => r.severity === "high" || r.severity === "critical").length;
  if (n > 0 && hi >= Math.ceil(n * 0.5)) score += 1;
  const often = relatedReports.filter((r) => r.frequency === "daily" || r.frequency === "weekly").length;
  if (n > 0 && often >= Math.ceil(n * 0.5)) score += 1;
  if (n === 1) score = Math.min(score, 4);
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

function computeDifficulty(category: FrictionCategory, patterns: RoadmapDetectedPattern[]): RecommendationDifficulty {
  let score = 1;
  if (patterns.some((p) => p.id === "cross_functional_process")) score += 2;
  if (patterns.some((p) => p.id === "organization_wide_process_load")) score += 1;
  if (category === "Manual data entry" || category === "Waiting on another team") score += 1;
  if (category === "Tool confusion" || category === "Missing documentation") score += 0;
  if (category === "Approval bottleneck") score += 1;
  if (score >= 4) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}

function implementationPlanText(pb: CategoryRecommendationPlaybook): string {
  return [
    "Immediate (this week)",
    pb.immediate,
    "",
    "Medium term (2–6 weeks)",
    pb.mediumTerm,
    "",
    "Long-term prevention",
    pb.longTerm,
  ].join("\n");
}

function mergeSuggestedFix(
  category: FrictionCategory,
  customSuggestion: string | undefined,
  patternNarratives: string[],
): string {
  const base = CATEGORY_BASE_SUGGESTED_FIX[category];
  const primary = customSuggestion?.trim() ? customSuggestion.trim() : base;
  if (!patternNarratives.length) return primary;
  const tail = patternNarratives.slice(0, 2).map((p) => `• ${p}`).join(" ");
  return `${primary} ${tail}`;
}

function mergeFirstStep(category: FrictionCategory, patterns: RoadmapDetectedPattern[]): string {
  let step = CATEGORY_BASE_FIRST_STEP[category];
  const cross = patterns.find((p) => p.id === "cross_functional_process");
  if (cross) {
    step = `${step} ${cross.narrative}`;
  }
  const dailyManual = patterns.find((p) => p.id === "daily_manual_entry");
  if (dailyManual) {
    step = `${step} ${dailyManual.narrative}`;
  }
  return step;
}

function riskIfIgnoredText(
  category: FrictionCategory,
  monthlyCost: number,
  priorityLevel: RoadmapPriorityLevel,
  patterns: RoadmapDetectedPattern[],
  currency: AppCurrencyCode,
): string {
  const costPhrase = `Cost and time leakage can persist at roughly ${formatCurrency(Math.round(monthlyCost), currency)}/month while this cluster stays unaddressed (estimate based on current reports, not a guarantee).`;
  const pri =
    priorityLevel === "Critical" || priorityLevel === "High"
      ? "Because this is ranked high priority, delays likely compound into missed deadlines, customer impact, or audit exposure depending on your context."
      : "Even medium-priority drag adds up when it repeats every week.";
  const cat: Record<FrictionCategory, string> = {
    "Access delay": "Without change, teams keep losing cycles waiting on gates that could be streamlined.",
    "Approval bottleneck": "Queues lengthen quietly until work piles up and exceptions become the norm.",
    "Manual data entry": "Manual paths tend to sprawl — errors, rework, and key-person risk increase over time.",
    "Tool confusion": "Tool sprawl creates inconsistent data and slows onboarding for new hires.",
    "Missing documentation": "Knowledge stays tribal; outages and handoffs take longer than they should.",
    "Duplicate work": "Parallel efforts waste budget and create conflicting sources of truth.",
    "Waiting on another team": "Dependencies stay invisible until deadlines slip.",
    "Rework or error correction": "Quality debt shows up as unpredictable lead times and customer-visible defects.",
  };
  const patternExtra = patterns.find((p) => p.id === "unresolved_high_severity_cluster");
  const extra = patternExtra ? ` ${patternExtra.narrative}` : "";
  return `${cat[category]} ${costPhrase} ${pri}${extra}`;
}

function expectedBenefitText(monthlyHours: number, monthlyCost: number, currency: AppCurrencyCode): string {
  return (
    `If you address this cluster, teams could recover a meaningful portion of the roughly **${formatHours(monthlyHours)}** and **${formatCurrency(Math.round(monthlyCost), currency)}/month** modeled here. ` +
    "Treat that as directional: actual savings depend on adoption, scope of the fix, and what else changes in parallel."
  );
}

function adoptionNotesText(patterns: RoadmapDetectedPattern[], settings?: CompanyRecommendationSettings): string {
  const org = settings?.organizationLabel?.trim();
  const lines = [
    "Communicate the “why” to reporters so they know feedback drove a real experiment.",
    "Time-box a pilot (2–4 weeks) with one success metric before expanding scope.",
  ];
  if (org) lines.push(`Align owners inside ${org} so funding and priorities do not stall at a matrix handoff.`);
  for (const p of patterns.slice(0, 3)) {
    lines.push(p.narrative);
  }
  return lines.map((l) => `• ${l}`).join("\n");
}

function ownerSuggestionText(pb: CategoryRecommendationPlaybook, patterns: RoadmapDetectedPattern[]): string {
  let owner = pb.defaultOwner;
  if (patterns.some((p) => p.id === "cross_functional_process")) {
    owner = `Single process owner (director-level sponsor) coordinating across teams; day-to-day lead can sit in Operations or Engineering — ${owner}`;
  }
  return owner;
}

function estimatedTime(diff: RecommendationDifficulty): string {
  if (diff === "Low") return "Roughly 1–2 weeks for a credible pilot; 2–4 weeks to harden.";
  if (diff === "Medium") return "Roughly 2–6 weeks for pilot and adoption; allow longer if policy or vendor work is involved.";
  return "Roughly 1–3 months for a durable program across teams, tools, and policy.";
}

export interface RoadmapRecommendationFields {
  suggestedFix: string;
  firstStep: string;
  whyItMatters: string;
  implementationPlan: string;
  expectedBenefit: string;
  riskIfIgnored: string;
  adoptionNotes: string;
  difficulty: RecommendationDifficulty;
  estimatedImplementationTime: string;
  ownerSuggestion: string;
  successMetric: string;
  recommendationConfidence: RecommendationConfidence;
  detectedPatterns: RoadmapDetectedPattern[];
}

/**
 * Builds enriched recommendation fields for a single roadmap cluster.
 * Pass the same `item` shape used on the roadmap (scores and priority already assigned).
 */
export function buildRoadmapRecommendations(
  allReports: FrictionReport[],
  item: Pick<
    DerivedRoadmapItem,
    | "category"
    | "process"
    | "relatedReports"
    | "monthlyHours"
    | "monthlyCost"
    | "priorityLevel"
    | "whyItMatters"
  >,
  _metrics: DashboardMetrics,
  settings?: CompanyRecommendationSettings,
  currency: AppCurrencyCode = DEFAULT_APP_CURRENCY,
): RoadmapRecommendationFields {
  const { category, process, relatedReports, monthlyHours, monthlyCost, priorityLevel, whyItMatters } = item;
  const patterns = detectPatterns(allReports, relatedReports, category, process);
  const pb = CATEGORY_PLAYBOOKS[category];
  const customSuggestion = relatedReports.map((r) => r.suggestion).find((s) => s.trim().length > 0)?.trim();

  const patternNarratives = patterns.map((p) => p.narrative);
  const suggestedFix = mergeSuggestedFix(category, customSuggestion, patternNarratives);
  const firstStep = mergeFirstStep(category, patterns);

  const patternAppend =
    patterns.length > 0
      ? ` Pattern signals: ${patterns
          .slice(0, 2)
          .map((p) => p.label)
          .join("; ")}.`
      : "";
  const whyItMattersEnriched = `${whyItMatters}${patternAppend}`;

  const confidence = computeConfidence(relatedReports, patterns);
  const difficulty = computeDifficulty(category, patterns);

  return {
    suggestedFix,
    firstStep,
    whyItMatters: whyItMattersEnriched,
    implementationPlan: implementationPlanText(pb),
    expectedBenefit: expectedBenefitText(monthlyHours, monthlyCost, currency),
    riskIfIgnored: riskIfIgnoredText(category, monthlyCost, priorityLevel, patterns, currency),
    adoptionNotes: adoptionNotesText(patterns, settings),
    difficulty,
    estimatedImplementationTime: estimatedTime(difficulty),
    ownerSuggestion: ownerSuggestionText(pb, patterns),
    successMetric: pb.defaultSuccessMetric,
    recommendationConfidence: confidence,
    detectedPatterns: patterns,
  };
}
