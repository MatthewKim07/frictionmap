import { useMemo } from "react";

import { BarRow } from "@/components/dashboard/BarRow";
import { Metric } from "@/components/dashboard/Metric";
import { CategoryPill, SeverityPill } from "@/components/ui/pills";
import { BLENDED_HOURLY_USD } from "@/data/constants";
import { buildDashboardMetrics, monthlyHoursLostForReport } from "@/lib/calculations";
import { categoryColorHex, categoryMeta } from "@/lib/categoryMeta";
import { useFrictionStore } from "@/store/useFrictionStore";
import type { FrictionCategoryId } from "@/types";

export function OverviewPage() {
  const reports = useFrictionStore((s) => s.reports);
  const setPage = useFrictionStore((s) => s.setPage);

  const metrics = useMemo(() => buildDashboardMetrics(reports), [reports]);

  const top = useMemo(
    () =>
      [...reports]
        .sort((a, b) => monthlyHoursLostForReport(b) - monthlyHoursLostForReport(a))
        .slice(0, 4),
    [reports],
  );

  const cats = Object.entries(metrics.byCategoryHours)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = cats[0]?.[1] ?? 1;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1>FrictionMap</h1>
        <p className="subtitle" style={{ maxWidth: 560 }}>
          Find the hidden drag slowing your team down.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button type="button" className="btn coral" onClick={() => setPage("submit")}>
            Report friction
          </button>
          <button type="button" className="btn secondary" onClick={() => setPage("insights")}>
            View insights
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <Metric
          label="Hours lost this month"
          value={`${metrics.monthlyHoursLost.toLocaleString()}h`}
          sub="across all teams"
          icon="●"
          tone="coral"
        />
        <Metric
          label="Estimated cost"
          value={`$${(metrics.monthlyCostLost / 1000).toFixed(1)}k`}
          sub={`at $${BLENDED_HOURLY_USD}/hr blended`}
          icon="$"
          tone="amber"
        />
        <Metric
          label="Open friction reports"
          value={metrics.reportCount}
          sub="anonymous + aggregated"
          icon="◐"
          tone="lime"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-head">
            <h2>Top friction this week</h2>
            <button type="button" className="link" onClick={() => setPage("insights")}>
              See all →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {top.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <CategoryPill id={r.category} />
                    <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{r.team}</span>
                  </div>
                </div>
                <SeverityPill level={r.severity} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Hours lost by category</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Last 30 days</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
            {cats.map(([cid, h]) => (
              <BarRow
                key={cid}
                name={categoryMeta(cid as FrictionCategoryId).label}
                value={Math.round(h)}
                max={Math.round(max)}
                color={categoryColorHex(cid as FrictionCategoryId)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
