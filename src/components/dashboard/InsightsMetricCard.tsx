import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function InsightsMetricCard({
  label,
  value,
  explanation,
  impactLabel,
  icon,
  tone = "coral",
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  explanation: string;
  impactLabel?: string;
  icon?: string;
  tone?: "coral" | "amber" | "lime";
  delay?: number;
}) {
  return (
    <motion.div
      className="card metric"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
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
      <div className="metric-sub">{explanation}</div>
      {impactLabel && (
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--sage)", marginTop: 8 }}>{impactLabel}</div>
      )}
    </motion.div>
  );
}
