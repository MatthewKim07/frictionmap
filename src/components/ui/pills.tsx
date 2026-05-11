import type { FrictionCategory, RoadmapPriorityLevel, Severity } from "@/types";
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
