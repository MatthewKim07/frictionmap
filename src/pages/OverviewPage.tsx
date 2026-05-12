import { motion } from "framer-motion";
import { useMemo } from "react";

import { DemoControlsPanel } from "@/components/demo/DemoControlsPanel";
import { BarRow } from "@/components/dashboard/BarRow";
import { InsightsMetricCard } from "@/components/dashboard/InsightsMetricCard";
import { CategoryPill, RoadmapPriorityPill, SeverityPill } from "@/components/ui/pills";
import {
  buildDashboardMetrics,
  calculateMonthlyCost,
  formatCurrency,
  formatHours,
  getCategoryImpactRows,
  getHighestCostProcess,
  getOpenReportCount,
  getRecentReports,
} from "@/lib/frictionCalculations";
import { categoryColorHex } from "@/lib/categoryMeta";
import { generateRoadmapItems } from "@/lib/roadmap";
import { useFrictionStore } from "@/store/frictionStore";

export function OverviewPage() {
  const reports = useFrictionStore((s) => s.reports);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const setPage = useFrictionStore((s) => s.setPage);
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);

  const metrics = useMemo(() => buildDashboardMetrics(reports, hourlyRate), [reports, hourlyRate]);
  const openCount = useMemo(() => getOpenReportCount(reports), [reports]);
  const highestProcess = useMemo(() => getHighestCostProcess(reports), [reports]);
  const topRoadmap = useMemo(() => generateRoadmapItems(reports, hourlyRate)[0] ?? null, [reports, hourlyRate]);
  const recentFive = useMemo(() => getRecentReports(reports, 5), [reports]);
  const categoryRows = useMemo(() => getCategoryImpactRows(reports, hourlyRate), [reports, hourlyRate]);
  const maxCatHours = categoryRows[0]?.monthlyHours ?? 1;

  const topCategoryLabel = metrics.topCategory ?? "—";
  const topCategorySub = metrics.topCategory
    ? `${formatHours(metrics.topCategoryMonthlyHours)} · ${formatCurrency(Math.round(metrics.topCategoryMonthlyHours * hourlyRate))}/mo`
    : "Submit reports to see which category drives the most drag.";

  const processSub =
    highestProcess.process && highestProcess.monthlyCost > 0
      ? `${formatCurrency(Math.round(highestProcess.monthlyCost))}/mo aggregated across reports`
      : "No process cluster yet — add friction reports to populate this.";

  return (
    <div className="fade-in">
      <DemoControlsPanel />

      <motion.section
        aria-labelledby="overview-hero-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ marginBottom: 28 }}
      >
        <h1 id="overview-hero-heading" style={{ fontSize: "clamp(24px, 3.5vw, 32px)", marginBottom: 6 }}>
          Overview
        </h1>
        <p style={{ margin: "0 0 20px", maxWidth: 560, color: "var(--ink-soft)", lineHeight: 1.6, fontSize: 15 }}>
          A live summary of workflow friction across your team — hours lost, cost leakage, and what to fix first.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn coral" onClick={() => setPage("submit")}>
            Report friction
          </button>
          <button type="button" className="btn secondary" onClick={() => setPage("roadmap")}>
            Fix roadmap
          </button>
          {reports.length > 0 && (
            <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
              Impact report
            </button>
          )}
        </div>
      </motion.section>

      {reports.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No reports yet</p>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
            Start by reporting a workflow slowdown. Metrics, insights, and the fix roadmap will populate automatically.
          </p>
          <button type="button" className="btn coral" onClick={() => setPage("submit")}>
            Report your first friction
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="overview-metrics-heading" style={{ marginBottom: 28 }}>
            <h2 id="overview-metrics-heading" className="visually-hidden">Key metrics</h2>
            <div className="overview-metric-grid">
              <InsightsMetricCard
                label="Monthly hours lost"
                value={formatHours(metrics.monthlyHoursLost)}
                explanation="Total estimated hours lost per month across reports."
                icon="◷"
                tone="coral"
                delay={0}
              />
              <InsightsMetricCard
                label="Monthly cost"
                value={formatCurrency(metrics.monthlyCostLost)}
                explanation={`At ${formatCurrency(hourlyRate)}/hr blended rate.`}
                icon="$"
                tone="amber"
                delay={0.04}
              />
              <InsightsMetricCard
                label="Annualized"
                value={formatCurrency(metrics.annualizedCostLost)}
                explanation="Monthly cost × 12."
                icon="12"
                tone="lime"
                delay={0.08}
              />
              <InsightsMetricCard
                label="Open reports"
                value={openCount}
                explanation={`${metrics.reportCount} total · ${openCount} open.`}
                icon="◐"
                tone="coral"
                delay={0.1}
              />
              <InsightsMetricCard
                label="Top category"
                value={topCategoryLabel}
                explanation={topCategorySub}
                icon="▦"
                tone="amber"
                delay={0.12}
              />
              <InsightsMetricCard
                label="Highest-cost process"
                value={highestProcess.process || "—"}
                explanation={processSub}
                icon="→"
                tone="lime"
                delay={0.14}
              />
            </div>
          </section>

          {topRoadmap && (
            <motion.section
              aria-labelledby="overview-top-fix-heading"
              className="card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.05 }}
              style={{ borderLeft: "4px solid var(--amber)", padding: "20px 24px", marginBottom: 28 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: "0.04em", marginBottom: 10 }}>
                Top fix opportunity
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <RoadmapPriorityPill level={topRoadmap.priorityLevel} />
                <CategoryPill category={topRoadmap.category} />
                <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>{topRoadmap.process}</span>
              </div>
              <h2 id="overview-top-fix-heading" style={{ fontSize: 18, margin: "0 0 6px", lineHeight: 1.3 }}>
                {topRoadmap.problemTitle}
              </h2>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--coral)", marginBottom: 14, fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(Math.round(topRoadmap.monthlyCost))}/mo estimated leakage
              </div>
              <button type="button" className="btn secondary" onClick={() => setPage("roadmap")}>
                Open Fix Roadmap
              </button>
            </motion.section>
          )}

          <div className="grid-2" style={{ marginBottom: 28, alignItems: "start" }}>
            <section className="card" aria-labelledby="overview-recent-heading">
              <div className="section-head">
                <h2 id="overview-recent-heading" style={{ fontSize: 15 }}>Recent reports</h2>
                <button type="button" className="link" onClick={() => setPage("insights")}>All →</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 440 }}>
                  <caption className="visually-hidden">Five most recent friction reports</caption>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
                      <th scope="col" style={{ padding: "6px 8px 6px 0", color: "var(--ink-mute)", fontWeight: 600 }}>Title</th>
                      <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>Team</th>
                      <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>Severity</th>
                      <th scope="col" style={{ padding: "6px 0 6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>Est. /mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFive.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                        <td style={{ padding: "9px 8px 9px 0", fontWeight: 500, maxWidth: 180 }}>{r.title}</td>
                        <td style={{ padding: "9px 8px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{r.team}</td>
                        <td style={{ padding: "9px 8px" }}><SeverityPill severity={r.severity} /></td>
                        <td style={{ padding: "9px 0 9px 8px", fontVariantNumeric: "tabular-nums", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                          {formatCurrency(Math.round(calculateMonthlyCost(r, hourlyRate)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card" aria-labelledby="overview-category-heading">
              <div className="section-head">
                <h2 id="overview-category-heading" style={{ fontSize: 15 }}>By category</h2>
                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>hrs/mo</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
                {categoryRows.map((row) => (
                  <div key={row.category}>
                    <BarRow
                      name={row.category}
                      value={Math.round(row.monthlyHours * 10) / 10}
                      max={maxCatHours}
                      color={categoryColorHex(row.category)}
                    />
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 3, paddingLeft: 2, fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(row.monthlyCost)}/mo · {formatHours(row.monthlyHours)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

    </div>
  );
}
