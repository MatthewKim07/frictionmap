import { useMemo } from "react";

import type { AppCurrencyCode } from "@/constants/currency";
import { ResolutionHeatmap } from "@/components/resolution/ResolutionHeatmap";
import { formatCurrency } from "@/lib/frictionCalculations";
import { buildGithubResolutionHeatmap, getYearResolutionSummary, getResolutionSummary } from "@/lib/resolutionAnalytics";
import type { FrictionReport } from "@/types";

export function FrictionSolvedOverviewCard({
  reports,
  hourlyRate,
  currencyCode,
  onOpenInsights,
}: {
  reports: FrictionReport[];
  hourlyRate: number;
  currencyCode: AppCurrencyCode;
  onOpenInsights: () => void;
}) {
  const summary = useMemo(() => getResolutionSummary(reports, hourlyRate), [reports, hourlyRate]);
  const formatMoney = useMemo(() => (n: number) => formatCurrency(Math.round(n), currencyCode), [currencyCode]);
  const miniHeatmap = useMemo(
    () => buildGithubResolutionHeatmap(reports, hourlyRate, { kind: "rolling", endDate: new Date(), weekCount: 12 }, formatMoney),
    [reports, hourlyRate, formatMoney],
  );
  const currentYear = new Date().getUTCFullYear();
  const ytd = useMemo(() => getYearResolutionSummary(reports, currentYear, hourlyRate), [reports, hourlyRate, currentYear]);
  const captionId = "overview-friction-solved-heatmap";

  return (
    <section className="card" aria-labelledby="friction-solved-heading" style={{ padding: "18px 20px", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 id="friction-solved-heading" style={{ fontSize: 16, margin: "0 0 6px" }}>
            Friction solved
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.45, maxWidth: 480 }}>
            <strong>{ytd.frictionCount.toLocaleString()}</strong> friction{ytd.frictionCount === 1 ? "" : "s"} resolved in {currentYear} so far ·{" "}
            <strong>{formatCurrency(summary.totalResolvedMonthlyCost, currencyCode)}</strong> est. monthly cost addressed overall (directional).
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
            Below: last 12 weeks of resolution days (UTC). Open Insights for the full-year calendar.
          </p>
        </div>
        <button type="button" className="btn secondary" style={{ flexShrink: 0 }} onClick={onOpenInsights}>
          Resolution Activity →
        </button>
      </div>
      <div style={{ marginTop: 14 }}>
        <p id={captionId} className="visually-hidden">
          Last twelve weeks of resolution activity by day
        </p>
        <ResolutionHeatmap model={miniHeatmap} captionId={captionId} size="compact" formatMoney={formatMoney} />
      </div>
    </section>
  );
}
