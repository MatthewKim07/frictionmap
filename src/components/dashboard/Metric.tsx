import type { ReactNode } from "react";

export function Metric({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: string;
  tone?: "coral" | "amber" | "lime";
}) {
  return (
    <div className="card metric">
      <div className="metric-label">
        {icon && (
          <span
            className="metric-icon"
            style={{
              background:
                tone === "coral" ? "var(--coral-soft)" : tone === "amber" ? "var(--amber-soft)" : "var(--lime-soft)",
              color: tone === "coral" ? "#9a3a2f" : tone === "amber" ? "#8a5816" : "#5a6921",
            }}
          >
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
