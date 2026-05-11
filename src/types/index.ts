/** Shared TypeScript models for FrictionMap. */

import type {
  FrictionCategory,
  Frequency,
  ReportStatus,
  RoadmapPriorityLevel,
  Severity,
  Team,
} from "@/constants/friction";

export type {
  FrictionCategory,
  Frequency,
  ReportStatus,
  RoadmapPriorityLevel,
  Severity,
  Team,
} from "@/constants/friction";

/** Single friction report submitted by an employee. */
export interface FrictionReport {
  id: string;
  title: string;
  description: string;
  category: FrictionCategory;
  team: Team;
  process: string;
  timeLostHours: number;
  frequency: Frequency;
  severity: Severity;
  suggestion: string;
  status: ReportStatus;
  createdAt: string;
  whenLabel?: string;
  whoLabel?: string;
}

/** Roadmap row derived from grouped reports (category + process). */
export interface DerivedRoadmapItem {
  id: string;
  /** Short headline for cards and copy/export (often report title or process cluster). */
  problemTitle: string;
  problem: string;
  category: FrictionCategory;
  process: string;
  relatedReports: FrictionReport[];
  monthlyHours: number;
  monthlyCost: number;
  annualCost: number;
  priorityScore: number;
  priorityLevel: RoadmapPriorityLevel;
  whyItMatters: string;
  suggestedFix: string;
  /** Concrete first operational step by category. */
  firstStep: string;
  /** Derived from related report statuses (updates when reports are updated). */
  status: ReportStatus;
}

/** Aggregated metrics for overview / insights. */
export interface DashboardMetrics {
  monthlyHoursLost: number;
  monthlyCostLost: number;
  annualizedCostLost: number;
  reportCount: number;
  topCategory: FrictionCategory;
  topCategoryMonthlyHours: number;
  byCategoryHours: Record<string, number>;
  byTeamHours: Record<string, number>;
}
