import { motion } from "framer-motion";
import { useMemo } from "react";

import { BarRow } from "@/components/dashboard/BarRow";
import { InsightsMetricCard } from "@/components/dashboard/InsightsMetricCard";
import { CategoryPill, RoadmapPriorityPill, SeverityPill, StatusPill } from "@/components/ui/pills";
import { AVERAGE_HOURLY_COST } from "@/constants/friction";
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

function previewFix(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function OverviewPage() {
  const reports = useFrictionStore((s) => s.reports);
  const setPage = useFrictionStore((s) => s.setPage);
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);

  const metrics = useMemo(() => buildDashboardMetrics(reports, AVERAGE_HOURLY_COST), [reports]);
  const openCount = useMemo(() => getOpenReportCount(reports), [reports]);
  const highestProcess = useMemo(() => getHighestCostProcess(reports), [reports]);
  const topRoadmap = useMemo(() => generateRoadmapItems(reports)[0] ?? null, [reports]);
  const recentFive = useMemo(() => getRecentReports(reports, 5), [reports]);
  const categoryRows = useMemo(() => getCategoryImpactRows(reports, AVERAGE_HOURLY_COST), [reports]);
  const maxCatHours = categoryRows[0]?.monthlyHours ?? 1;

  const topCategoryLabel = metrics.topCategory ?? "—";
  const topCategorySub = metrics.topCategory
    ? `${formatHours(metrics.topCategoryMonthlyHours)} · ${formatCurrency(Math.round(metrics.topCategoryMonthlyHours * AVERAGE_HOURLY_COST))}/mo`
    : "Submit reports to see which category drives the most drag.";

  const processSub =
    highestProcess.process && highestProcess.monthlyCost > 0
      ? `${formatCurrency(Math.round(highestProcess.monthlyCost))}/mo aggregated across reports`
      : "No process cluster yet — add friction reports to populate this.";

  return (
    <div className="fade-in">
      <motion.section
        aria-labelledby="overview-hero-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        style={{ marginBottom: 36 }}
      >
        <h1 id="overview-hero-heading" style={{ fontSize: "clamp(28px, 4vw, 36px)", marginBottom: 8 }}>
          FrictionMap
        </h1>
        <p className="subtitle" style={{ maxWidth: 520, fontSize: 17, fontWeight: 500 }}>
          Find the hidden drag slowing your team down.
        </p>
        <p style={{ margin: "16px 0 0", maxWidth: 640, color: "var(--ink-soft)", lineHeight: 1.6, fontSize: 15 }}>
          Employees report small workflow slowdowns. FrictionMap turns them into cost estimates, insights, and a
          prioritized fix roadmap.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 24 }}>
          <button type="button" className="btn coral" onClick={() => setPage("submit")}>
            Report friction
          </button>
          <button type="button" className="btn secondary" onClick={() => setPage("roadmap")}>
            View roadmap
          </button>
          <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
            Generate impact report
          </button>
          <button type="button" className="link" style={{ fontSize: 14, padding: "8px 4px" }} onClick={() => setPage("insights")}>
            Insights →
          </button>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--ink-mute)" }}>
          Numbers below reflect all submitted friction reports.
        </p>
      </motion.section>

      <section aria-labelledby="overview-metrics-heading" style={{ marginBottom: 32 }}>
        <h2 id="overview-metrics-heading" className="visually-hidden">
          Executive metrics
        </h2>
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
            label="Monthly cost leakage"
            value={formatCurrency(metrics.monthlyCostLost)}
            explanation={`Loaded cost rate · $${AVERAGE_HOURLY_COST}/hr blended average.`}
            icon="$"
            tone="amber"
            delay={0.04}
          />
          <InsightsMetricCard
            label="Annualized leakage"
            value={formatCurrency(metrics.annualizedCostLost)}
            explanation="Monthly cost × 12 — rough annual exposure."
            icon="12"
            tone="lime"
            delay={0.08}
          />
          <InsightsMetricCard
            label="Open reports"
            value={openCount}
            explanation={`${metrics.reportCount} total reports · ${openCount} still open.`}
            icon="◐"
            tone="coral"
            delay={0.1}
          />
          <InsightsMetricCard
            label="Top friction category"
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

      <section aria-labelledby="overview-recommendation-heading" style={{ marginBottom: 32 }}>
        <h2 id="overview-recommendation-heading" className="visually-hidden">
          Top recommendation
        </h2>
        {topRoadmap ? (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.05 }}
            style={{
              borderLeft: "4px solid var(--amber)",
              padding: "22px 24px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: "0.04em" }}>
              Top fix opportunity
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 10 }}>
              <RoadmapPriorityPill level={topRoadmap.priorityLevel} />
              <CategoryPill category={topRoadmap.category} />
              <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>{topRoadmap.process}</span>
            </div>
            <h3 style={{ fontSize: 20, margin: "12px 0 8px", lineHeight: 1.3 }}>{topRoadmap.problemTitle}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              {previewFix(topRoadmap.suggestedFix, 220)}
            </p>
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: "var(--coral)", fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(Math.round(topRoadmap.monthlyCost))}/mo estimated leakage
            </div>
            <button type="button" className="btn secondary" style={{ marginTop: 18 }} onClick={() => setPage("roadmap")}>
              Open Fix Roadmap
            </button>
          </motion.div>
        ) : (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>No roadmap items yet</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              Once teammates submit friction reports, FrictionMap will cluster the biggest bottlenecks and rank them here.
            </p>
            <button type="button" className="btn coral" style={{ marginTop: 16 }} onClick={() => setPage("submit")}>
              Report friction
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="overview-how-heading" style={{ marginBottom: 32 }}>
        <h2 id="overview-how-heading" style={{ fontSize: 20, marginBottom: 18 }}>
          How it works
        </h2>
        <div className="grid-3">
          <div className="card" style={{ padding: 20 }}>
            <div className="how-step">
              <div className="how-step-num" aria-hidden>
                1
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>Report friction</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Capture slowdowns in under a minute — category, process, severity, and impact.
                </p>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="how-step">
              <div className="how-step-num" aria-hidden>
                2
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>Quantify impact</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Hours and dollars roll up automatically so leadership sees real cost leakage.
                </p>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="how-step">
              <div className="how-step-num" aria-hidden>
                3
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>Fix what matters</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Use Insights for patterns and the Fix Roadmap to prioritize the highest-leverage fixes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-2" style={{ marginBottom: 32, alignItems: "start" }}>
        <section className="card" aria-labelledby="overview-recent-heading">
          <div className="section-head">
            <h2 id="overview-recent-heading">Recent friction reports</h2>
            <button type="button" className="link" onClick={() => setPage("insights")}>
              All insights →
            </button>
          </div>
          {recentFive.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>No reports yet. Be the first to submit one.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
                <caption className="visually-hidden">Five most recent friction reports</caption>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
                    <th scope="col" style={{ padding: "8px 10px 8px 0", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Title
                    </th>
                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Team
                    </th>
                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Category
                    </th>
                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Severity
                    </th>
                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Est. /mo
                    </th>
                    <th scope="col" style={{ padding: "8px 0 8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentFive.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                      <td style={{ padding: "10px 10px 10px 0", fontWeight: 500, maxWidth: 200 }}>{r.title}</td>
                      <td style={{ padding: "10px 8px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{r.team}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <CategoryPill category={r.category} />
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        <SeverityPill severity={r.severity} />
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--ink-soft)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(Math.round(calculateMonthlyCost(r)))}
                      </td>
                      <td style={{ padding: "10px 0 10px 8px" }}>
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="overview-category-heading">
          <div className="section-head">
            <h2 id="overview-category-heading">Category snapshot</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Hours & cost / month</span>
          </div>
          {categoryRows.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>Categories will appear after you add reports.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 6 }}>
              {categoryRows.map((row) => (
                <div key={row.category}>
                  <BarRow
                    name={row.category}
                    value={Math.round(row.monthlyHours * 10) / 10}
                    max={maxCatHours}
                    color={categoryColorHex(row.category)}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 4,
                      paddingLeft: 2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(row.monthlyCost)}/mo · {formatHours(row.monthlyHours)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="overview-demo-heading" className="card" style={{ padding: 24, background: "var(--surface)" }}>
        <h2 id="overview-demo-heading" style={{ fontSize: 18, marginBottom: 12 }}>
          Why this matters
        </h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-soft)", lineHeight: 1.65, fontSize: 15 }}>
          <li style={{ marginBottom: 8 }}>Small delays usually stay invisible — they never make it to a project plan.</li>
          <li style={{ marginBottom: 8 }}>FrictionMap converts them into measurable cost leakage managers can compare.</li>
          <li>Teams can prioritize fixes by actual business impact, not loudest complaint.</li>
        </ul>
        <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--ink-mute)" }}>
          Tip for demos: submit a report, return here, and watch metrics and the top recommendation update live.
        </p>
      </section>
    </div>
  );
}
