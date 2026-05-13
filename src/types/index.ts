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

export type RecommendationConfidence = "High" | "Medium" | "Low";
export type RecommendationDifficulty = "Low" | "Medium" | "High";

/** Pattern label used by the recommendation engine and roadmap UI. */
export interface RoadmapDetectedPattern {
  id: string;
  label: string;
  narrative: string;
}

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
  /** When the report was last marked resolved (cleared when status leaves resolved). */
  resolvedAt?: string;
  /** Last mutation time for the report row (status edits, triage, etc.). */
  updatedAt?: string;
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
  /** Markdown-friendly bullets: immediate / medium / long-term. */
  implementationPlan: string;
  /** Plain-language benefit framing; estimates, not guarantees. */
  expectedBenefit: string;
  riskIfIgnored: string;
  adoptionNotes: string;
  difficulty: RecommendationDifficulty;
  estimatedImplementationTime: string;
  ownerSuggestion: string;
  successMetric: string;
  recommendationConfidence: RecommendationConfidence;
  detectedPatterns: RoadmapDetectedPattern[];
  /** Derived from related report statuses (updates when reports are updated). */
  status: ReportStatus;
}

/** Aggregated metrics for overview / insights. */
export interface DashboardMetrics {
  monthlyHoursLost: number;
  monthlyCostLost: number;
  annualizedCostLost: number;
  reportCount: number;
  topCategory: FrictionCategory | null;
  topCategoryMonthlyHours: number;
  byCategoryHours: Record<string, number>;
  byTeamHours: Record<string, number>;
}
