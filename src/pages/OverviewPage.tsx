import { useMemo } from "react";

import { BarRow } from "@/components/dashboard/BarRow";
import { Metric } from "@/components/dashboard/Metric";
import { CategoryPill, SeverityPill } from "@/components/ui/pills";
import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import { buildDashboardMetrics, calculateMonthlyHours, filterReports } from "@/lib/frictionCalculations";
import { categoryColorHex } from "@/lib/categoryMeta";
import { useFrictionStore } from "@/store/frictionStore";
import type { FrictionCategory } from "@/types";

export function OverviewPage() {
  const reports = useFrictionStore((s) => s.reports);
  const filters = useFrictionStore((s) => s.filters);
  const setPage = useFrictionStore((s) => s.setPage);

  const filtered = useMemo(() => filterReports(reports, filters), [reports, filters]);

  const metrics = useMemo(() => buildDashboardMetrics(filtered, AVERAGE_HOURLY_COST), [filtered]);

  const top = useMemo(
    () =>
      [...filtered].sort((a, b) => calculateMonthlyHours(b) - calculateMonthlyHours(a)).slice(0, 4),
    [filtered],
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
          sub="across all teams (filtered view)"
          icon="●"
          tone="coral"
        />
        <Metric
          label="Estimated cost"
          value={`$${(metrics.monthlyCostLost / 1000).toFixed(1)}k`}
          sub={`$${AVERAGE_HOURLY_COST}/hr · annualized ~ $${(metrics.annualizedCostLost / 1000).toFixed(1)}k`}
          icon="$"
          tone="amber"
        />
        <Metric
          label="Open friction reports"
          value={metrics.reportCount}
          sub={`Top category: ${metrics.topCategory} (${metrics.topCategoryMonthlyHours}h/mo)`}
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
                    <CategoryPill category={r.category} />
                    <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{r.team}</span>
                  </div>
                </div>
                <SeverityPill severity={r.severity} />
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
            {cats.map(([cat, h]) => (
              <BarRow
                key={cat}
                name={cat}
                value={Math.round(h)}
                max={Math.round(max)}
                color={categoryColorHex(cat as FrictionCategory)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
