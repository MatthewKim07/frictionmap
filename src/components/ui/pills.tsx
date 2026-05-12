import type {
  FrictionCategory,
  RecommendationConfidence,
  RecommendationDifficulty,
  ReportStatus,
  RoadmapPriorityLevel,
  Severity,
} from "@/types";
import { categoryMeta } from "@/lib/categoryMeta";

export function CategoryPill({ category }: { category: FrictionCategory }) {
  const { label, tone } = categoryMeta(category);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

function severityTone(severity: Severity): "coral" | "amber" | "lime" {
  if (severity === "critical" || severity === "high") return "coral";
  if (severity === "medium") return "amber";
  return "lime";
}

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const tone = severityTone(severity);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function roadmapPriorityTone(level: RoadmapPriorityLevel): "coral" | "amber" | "lime" {
  if (level === "Critical" || level === "High") return "coral";
  if (level === "Medium") return "amber";
  return "lime";
}

/** Rank badge for derived roadmap rows (Critical / High / Medium / Low). */
export function RoadmapPriorityPill({ level }: { level: RoadmapPriorityLevel }) {
  const tone = roadmapPriorityTone(level);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {level}
    </span>
  );
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  resolved: "Resolved",
};

function statusTone(status: ReportStatus): "coral" | "amber" | "lime" | "ink" {
  if (status === "open") return "coral";
  if (status === "reviewing" || status === "planned") return "amber";
  if (status === "resolved") return "lime";
  return "ink";
}

export function StatusPill({ status }: { status: ReportStatus }) {
  const tone = statusTone(status);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const CONFIDENCE_LABEL: Record<RecommendationConfidence, string> = {
  High: "High confidence",
  Medium: "Medium confidence",
  Low: "Low confidence",
};

function confidenceTone(c: RecommendationConfidence): "lime" | "amber" | "ink" {
  if (c === "High") return "lime";
  if (c === "Medium") return "amber";
  return "ink";
}

/** Rule-based recommendation strength (not model certainty). */
export function RecommendationConfidencePill({ level }: { level: RecommendationConfidence }) {
  const tone = confidenceTone(level);
  return (
    <span className={`pill ${tone}`} title="Based on report count, patterns, and severity/frequency consistency.">
      <span className="dot" />
      {CONFIDENCE_LABEL[level]}
    </span>
  );
}

const DIFFICULTY_LABEL: Record<RecommendationDifficulty, string> = {
  Low: "Effort: Low",
  Medium: "Effort: Medium",
  High: "Effort: High",
};

function difficultyTone(d: RecommendationDifficulty): "lime" | "amber" | "coral" {
  if (d === "Low") return "lime";
  if (d === "Medium") return "amber";
  return "coral";
}

export function ImplementationDifficultyPill({ level }: { level: RecommendationDifficulty }) {
  const tone = difficultyTone(level);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}
