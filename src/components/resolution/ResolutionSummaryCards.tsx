import type { AppCurrencyCode } from "@/constants/currency";
import { formatCurrency, formatHours } from "@/lib/frictionCalculations";
import type { ResolutionSummary } from "@/lib/resolutionAnalytics";

export function ResolutionSummaryCards({
  summary,
  currencyCode,
}: {
  summary: ResolutionSummary;
  currencyCode: AppCurrencyCode;
}) {
  const cells = [
    { label: "Frictions resolved", value: summary.totalResolvedReports.toLocaleString(), sub: "Reports in Resolved status" },
    {
      label: "Est. monthly hours addressed",
      value: formatHours(summary.totalResolvedMonthlyHours),
      sub: "Directional hours / month at current frequency",
    },
    {
      label: "Est. monthly cost addressed",
      value: `${formatCurrency(summary.totalResolvedMonthlyCost, currencyCode)}/mo`,
      sub: "Blended rate × hours addressed",
    },
    {
      label: "Est. annualized cost addressed",
      value: formatCurrency(summary.totalResolvedAnnualizedCost, currencyCode),
      sub: "Monthly × 12 — illustrative",
    },
    {
      label: "Percent of friction cost addressed",
      value: `${summary.percentCostAddressed}%`,
      sub: `${summary.percentReportsAddressed}% of reports resolved · unresolved est. ${formatCurrency(summary.unresolvedMonthlyCost, currencyCode)}/mo`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))",
        gap: 12,
      }}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid var(--rule)",
            background: "var(--surface)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {c.label}
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4, lineHeight: 1.4 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
