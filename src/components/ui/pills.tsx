import type { FrictionCategoryId, RoadmapPriority, Severity } from "@/types";
import { SEVERITY_LABELS } from "@/data/constants";
import { categoryMeta } from "@/lib/categoryMeta";

export function CategoryPill({ id }: { id: FrictionCategoryId }) {
  const meta = categoryMeta(id);
  return (
    <span className={`pill ${meta.color}`}>
      <span className="dot" />
      {meta.label}
    </span>
  );
}

export function SeverityPill({ level }: { level: Severity }) {
  const tone = level >= 4 ? "coral" : level === 3 ? "coral" : level === 2 ? "amber" : "lime";
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {SEVERITY_LABELS[level]}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: RoadmapPriority }) {
  const tone = priority === "high" ? "coral" : priority === "medium" ? "amber" : "lime";
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);
  return (
    <span className={`pill ${tone}`}>
      <span className="dot" />
      {label} priority
    </span>
  );
}
