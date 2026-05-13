import { useMemo } from "react";

import type { AppCurrencyCode } from "@/constants/currency";
import { ResolutionHeatmap } from "@/components/resolution/ResolutionHeatmap";
import { ResolutionSummaryCards } from "@/components/resolution/ResolutionSummaryCards";
import { RecentWinsList } from "@/components/resolution/RecentWinsList";
import { formatCurrency } from "@/lib/frictionCalculations";
import {
  buildResolutionHeatmapDays,
  getRecentResolvedReports,
  getResolutionSummary,
  getResolvedImpactByProcess,
  getResolvedImpactByTeam,
} from "@/lib/resolutionAnalytics";
import type { FrictionReport } from "@/types";

export function ResolutionActivity({
  reports,
  hourlyRate,
  currencyCode,
}: {
  reports: FrictionReport[];
  hourlyRate: number;
  currencyCode: AppCurrencyCode;
}) {
  const summary = useMemo(() => getResolutionSummary(reports, hourlyRate), [reports, hourlyRate]);
  const heatmapCells = useMemo(
    () => buildResolutionHeatmapDays(reports, hourlyRate, new Date(), 70),
    [reports, hourlyRate],
  );
  const recent = useMemo(() => getRecentResolvedReports(reports, 12), [reports]);
  const byTeam = useMemo(() => getResolvedImpactByTeam(reports, hourlyRate).slice(0, 6), [reports, hourlyRate]);
  const byProcess = useMemo(() => getResolvedImpactByProcess(reports, hourlyRate).slice(0, 6), [reports, hourlyRate]);

  const captionId = "resolution-heatmap-caption";

  return (
    <section className="card" style={{ marginBottom: 24, padding: "20px 22px" }} aria-labelledby="resolution-activity-heading">
      <h2 id="resolution-activity-heading" style={{ fontSize: 18, marginBottom: 8 }}>
        Resolution Activity
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
        Directional view of friction removed over time. Dollar and hour figures are <strong>estimates</strong> from submitted reports and your blended rate — not guaranteed savings.
      </p>

      <ResolutionSummaryCards summary={summary} currencyCode={currencyCode} />

      <div style={{ marginTop: 22 }}>
        <h3 style={{ fontSize: 15, margin: "0 0 6px", fontWeight: 600 }}>Activity heatmap</h3>
        <p id={captionId} style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Each square represents friction your company removed. Darker cells mean more estimated time or cost was addressed that day. Hover or focus a square for the exact counts.
        </p>
        <ResolutionHeatmap cells={heatmapCells} captionId={captionId} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, margin: "0 0 10px", fontWeight: 600 }}>Recent wins</h3>
        <RecentWinsList reports={recent} hourlyRate={hourlyRate} currencyCode={currencyCode} limit={8} />
      </div>

      <div className="grid-2" style={{ gap: 20, marginTop: 24, alignItems: "start" }}>
        <div>
          <h3 style={{ fontSize: 15, margin: "0 0 10px", fontWeight: 600 }}>Teams — est. cost addressed</h3>
          {byTeam.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>No resolved reports in this view.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
              {byTeam.map((row) => (
                <li
                  key={row.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{row.name}</span>
                  <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {row.resolvedCount} resolved · {formatCurrency(row.monthlyCostAddressed, currencyCode)}/mo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 style={{ fontSize: 15, margin: "0 0 10px", fontWeight: 600 }}>Processes — est. cost addressed</h3>
          {byProcess.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>No resolved reports in this view.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13 }}>
              {byProcess.map((row) => (
                <li
                  key={row.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{row.name}</span>
                  <span style={{ color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {row.resolvedCount} resolved · {formatCurrency(row.monthlyCostAddressed, currencyCode)}/mo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
