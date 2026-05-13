import { useMemo } from "react";

import type { AppCurrencyCode } from "@/constants/currency";
import { ResolutionHeatmap } from "@/components/resolution/ResolutionHeatmap";
import { formatCurrency } from "@/lib/frictionCalculations";
import { buildResolutionHeatmapDays, getResolutionSummary } from "@/lib/resolutionAnalytics";
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
  const miniHeatmap = useMemo(
    () => buildResolutionHeatmapDays(reports, hourlyRate, new Date(), 28),
    [reports, hourlyRate],
  );
  const captionId = "overview-friction-solved-heatmap";

  return (
    <section className="card" aria-labelledby="friction-solved-heading" style={{ padding: "18px 20px", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 id="friction-solved-heading" style={{ fontSize: 16, margin: "0 0 6px" }}>
            Friction solved
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.45, maxWidth: 420 }}>
            {summary.totalResolvedReports.toLocaleString()} resolved ·{" "}
            <strong>{formatCurrency(summary.totalResolvedMonthlyCost, currencyCode)}</strong> est. monthly cost addressed (directional).
          </p>
        </div>
        <button type="button" className="btn secondary" style={{ flexShrink: 0 }} onClick={onOpenInsights}>
          Resolution Activity →
        </button>
      </div>
      <div style={{ marginTop: 14 }}>
        <p id={captionId} className="visually-hidden">
          Last four weeks of resolution activity by day
        </p>
        <ResolutionHeatmap cells={miniHeatmap} captionId={captionId} />
      </div>
    </section>
  );
}
