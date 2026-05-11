/** Shared TypeScript models for FrictionMap (decoupled from UI). */

import type {
  FrictionCategoryId,
  Frequency,
  ReportStatus,
  RoadmapPriority,
  Severity,
  Team,
} from "@/data/constants";

export type {
  FrictionCategoryId,
  Frequency,
  ReportStatus,
  RoadmapPriority,
  Severity,
  Team,
} from "@/data/constants";

/** Single friction report submitted by an employee. */
export interface FrictionReport {
  id: string;
  title: string;
  description: string;
  category: FrictionCategoryId;
  team: Team;
  /** Tool or workflow where time was lost (e.g. Snowflake, approval chain). */
  process: string;
  /** Hours lost per occurrence (not annualized). */
  timeLostHours: number;
  frequency: Frequency;
  severity: Severity;
  suggestion: string;
  status: ReportStatus;
  createdAt: string;
  /** Short label for tables ("2h ago") — demo-friendly; replace with real relative time later. */
  whenLabel?: string;
  /** Display name for attribution in demos ("M. Okafor"). */
  whoLabel?: string;
}

/** Curated fix proposal shown on the roadmap (may aggregate multiple reports). */
export interface RoadmapItem {
  id: string;
  title: string;
  problem: string;
  suggestion: string;
  categoryTag: FrictionCategoryId;
  team: string;
  /** Hours per month this fix could return if shipped (used for ordering + costs). */
  estimatedMonthlyHoursSaved: number;
  effort: "Small" | "Medium" | "Large";
  priority: RoadmapPriority;
}

/** Aggregated metrics for overview / insights / roadmap ranking. */
export interface DashboardMetrics {
  /** Total estimated hours lost in a month across all open reports. */
  monthlyHoursLost: number;
  /** Monthly operational cost from lost time at the blended rate. */
  monthlyCostLost: number;
  /** Simple annualization of monthly cost (no discounting). */
  annualizedCostLost: number;
  /**
   * Potential annual savings if top fixes capture a slice of drag (product assumption for demos).
   * Not the same as annualizedCostLost — expresses opportunity, not current leakage.
   */
  annualSavingsOpportunity: number;
  reportCount: number;
  topCategoryId: FrictionCategoryId;
  topCategoryMonthlyHours: number;
  byCategoryHours: Record<string, number>;
  byTeamHours: Record<string, number>;
}
