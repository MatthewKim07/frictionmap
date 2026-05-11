import { useMemo } from "react";

import { BarRow } from "@/components/dashboard/BarRow";
import { CategoryPill, SeverityPill } from "@/components/ui/pills";
import {
  buildDashboardMetrics,
  calculateMonthlyCost,
  calculateMonthlyHours,
  filterReports,
  getRecentReports,
} from "@/lib/frictionCalculations";
import { categoryColorHex } from "@/lib/categoryMeta";
import { useFrictionStore } from "@/store/frictionStore";
import type { FrictionCategory } from "@/types";

const TEAM_BAR_COLORS = ["#E45A4C", "#E89B3C", "#B6C84A", "#6E7A4A", "#E45A4C", "#E89B3C", "#B6C84A", "#6E7A4A"];

export function InsightsPage() {
  const reports = useFrictionStore((s) => s.reports);
  const filters = useFrictionStore((s) => s.filters);
  const setPage = useFrictionStore((s) => s.setPage);

  const filtered = useMemo(() => filterReports(reports, filters), [reports, filters]);

  const metrics = useMemo(() => buildDashboardMetrics(filtered), [filtered]);

  const cats = Object.entries(metrics.byCategoryHours).sort((a, b) => b[1] - a[1]);
  const teams = Object.entries(metrics.byTeamHours).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] ?? 1;
  const maxTeam = teams[0]?.[1] ?? 1;

  const processes = useMemo(
    () =>
      [...filtered]
        .map((r) => ({
          ...r,
          monthly: calculateMonthlyHours(r),
          cost: calculateMonthlyCost(r),
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5),
    [filtered],
  );
  const maxProcessCost = processes[0]?.cost ?? 1;

  const recent = useMemo(() => getRecentReports(filtered, 8), [filtered]);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1>Insights</h1>
          <p className="subtitle">Where time and money go this month.</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => setPage("roadmap")}>
          See fix roadmap →
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-head">
            <h2>Hours lost by category</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{Math.round(maxCat)}h max</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cats.map(([cat, h]) => (
              <BarRow
                key={cat}
                name={cat}
                value={Math.round(h)}
                max={Math.round(maxCat)}
                color={categoryColorHex(cat as FrictionCategory)}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Hours lost by team</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{teams.length} teams</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {teams.map(([t, h], i) => (
              <BarRow
                key={t}
                name={t}
                value={Math.round(h)}
                max={Math.round(maxTeam)}
                color={TEAM_BAR_COLORS[i % TEAM_BAR_COLORS.length]!}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>Highest-cost processes</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Monthly estimate</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {processes.map((p) => {
            const pct = Math.max(2, Math.round((p.cost / maxProcessCost) * 100));
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{p.team}</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: categoryColorHex(p.category) }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>
                    ${Math.round(p.cost).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{Math.round(p.monthly)}h/mo</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Recent reports</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{filtered.length} in view</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Team</th>
              <th>Category</th>
              <th>Severity</th>
              <th style={{ textAlign: "right" }}>Hours</th>
              <th style={{ textAlign: "right" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.title}</td>
                <td style={{ color: "var(--ink-soft)" }}>{r.team}</td>
                <td>
                  <CategoryPill category={r.category} />
                </td>
                <td>
                  <SeverityPill severity={r.severity} />
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.timeLostHours}h</td>
                <td style={{ textAlign: "right", color: "var(--ink-mute)", fontSize: 13 }}>
                  {r.whenLabel ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
