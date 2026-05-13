import { motion } from "framer-motion";
import { useMemo } from "react";

import {
  CategoryHoursBarChart,
  ReportSubmissionTrendChart,
  SavingsLeakageComparisonChart,
  SeverityDistributionChart,
  TeamCostBarChart,
} from "@/components/charts/InsightsCharts";
import { DEFAULT_COMPANY_NAME } from "@/constants/companySettings";
import { InsightsMetricCard } from "@/components/dashboard/InsightsMetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryPill, SeverityPill, StatusPill } from "@/components/ui/pills";
import { getEffectiveTeamOptions } from "@/constants/companySettings";
import {
  FRICTION_CATEGORIES,
  REPORT_STATUSES,
  SEVERITIES,
} from "@/constants/friction";
import {
  buildDashboardMetrics,
  buildInsightsPlainSummary,
  calculateMonthlyCost,
  filterReports,
  formatCurrency,
  formatHours,
  formatReportDate,
  getAverageFrictionScore,
  getCriticalHighCount,
  getHighestCostProcess,
  getOpenReportCount,
  getProcessCostRanking,
  getRecentReports,
  getSeverityCounts,
  getTeamMonthlyCosts,
} from "@/lib/frictionCalculations";
import { generateRoadmapItems } from "@/lib/roadmap";
import {
  buildImpactFunnel,
  buildReportSubmissionTrend,
  computeSavingsAnalytics,
  suggestTrendBucket,
} from "@/lib/savingsAnalytics";
import {
  canOpenBusinessImpactReport,
  canShowOverviewDemoToolbar,
  roleMayAccessPage,
} from "@/lib/roleAccess";
import { useEffectiveOrgRole } from "@/hooks/useEffectiveOrgRole";
import { useFrictionStore } from "@/store/frictionStore";
import type { FrictionCategory, ReportStatus, Severity, Team } from "@/types";

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  resolved: "Resolved",
};

export function InsightsPage() {
  const reports = useFrictionStore((s) => s.reports);
  const filters = useFrictionStore((s) => s.filters);
  const setFilters = useFrictionStore((s) => s.setFilters);
  const clearFilters = useFrictionStore((s) => s.clearFilters);
  const setPage = useFrictionStore((s) => s.setPage);
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const companySettings = useFrictionStore((s) => s.companySettings);
  const currencyCode = companySettings.currencyCode;
  const simulationRole = useEffectiveOrgRole();
  const mayImpactReport = canOpenBusinessImpactReport(simulationRole);
  const mayRoadmap = roleMayAccessPage(simulationRole, "roadmap");
  const mayOverviewToolbox = canShowOverviewDemoToolbar(simulationRole);
  const orgTrim = companySettings.companyName.trim();
  const roadmapRec =
    orgTrim && orgTrim !== DEFAULT_COMPANY_NAME ? { organizationLabel: orgTrim } : undefined;

  const teamFilterOptions = useMemo(() => {
    const base = getEffectiveTeamOptions(companySettings);
    const fromData = [...new Set(reports.map((r) => r.team))];
    const merged = [...base];
    for (const t of fromData) {
      if (!merged.includes(t)) merged.push(t);
    }
    return merged.sort((a, b) => a.localeCompare(b));
  }, [companySettings, reports]);

  const filtered = useMemo(() => filterReports(reports, filters), [reports, filters]);

  const hasAnyReports = reports.length > 0;
  const isFilteredEmpty = hasAnyReports && filtered.length === 0;

  const metrics = useMemo(() => buildDashboardMetrics(filtered, hourlyRate), [filtered, hourlyRate]);
  const topCatCost = useMemo(
    () => Math.round(metrics.topCategoryMonthlyHours * hourlyRate),
    [metrics.topCategoryMonthlyHours, hourlyRate],
  );
  const highestProcess = useMemo(() => getHighestCostProcess(filtered), [filtered]);
  const openCount = useMemo(() => getOpenReportCount(filtered), [filtered]);
  const critHigh = useMemo(() => getCriticalHighCount(filtered), [filtered]);
  const avgScore = useMemo(() => getAverageFrictionScore(filtered), [filtered]);
  const summaryText = useMemo(
    () => buildInsightsPlainSummary(filtered, hourlyRate, currencyCode),
    [filtered, hourlyRate, currencyCode],
  );

  const categoryChartData = useMemo(
    () =>
      Object.entries(metrics.byCategoryHours)
        .map(([name, hours]) => ({
          name,
          hours: Math.round(hours * 10) / 10,
          category: name as FrictionCategory,
        }))
        .filter((d) => d.hours > 0),
    [metrics.byCategoryHours],
  );

  const teamCostData = useMemo(() => {
    return getTeamMonthlyCosts(filtered, hourlyRate)
      .filter((t) => t.monthlyCost > 0)
      .map((t) => ({ name: t.team, cost: t.monthlyCost }));
  }, [filtered, hourlyRate]);

  const severityData = useMemo(() => getSeverityCounts(filtered), [filtered]);
  const severityTotal = useMemo(() => severityData.reduce((s, d) => s + d.count, 0), [severityData]);
  const processRank = useMemo(
    () => getProcessCostRanking(filtered, hourlyRate).slice(0, 10),
    [filtered, hourlyRate],
  );
  const recent = useMemo(() => getRecentReports(filtered, 12), [filtered]);

  const roadmapItems = useMemo(
    () => generateRoadmapItems(filtered, hourlyRate, currencyCode, roadmapRec),
    [filtered, hourlyRate, currencyCode, orgTrim],
  );
  const savingsModel = useMemo(
    () => computeSavingsAnalytics(filtered, hourlyRate, roadmapItems),
    [filtered, hourlyRate, roadmapItems],
  );
  const funnelSteps = useMemo(
    () => buildImpactFunnel(filtered, roadmapItems, savingsModel.resolvedMonthlyCost),
    [filtered, roadmapItems, savingsModel.resolvedMonthlyCost],
  );
  const trendBucket = useMemo(() => suggestTrendBucket(filtered), [filtered]);
  const trendSeries = useMemo(
    () => buildReportSubmissionTrend(filtered, hourlyRate, trendBucket),
    [filtered, hourlyRate, trendBucket],
  );

  const filtersActive =
    filters.selectedTeam !== null ||
    filters.selectedCategory !== null ||
    filters.selectedStatus !== null ||
    filters.selectedSeverity !== null;

  if (!hasAnyReports) {
    return (
      <div className="fade-in">
        <h1>Insights</h1>
        <p className="subtitle">You need a few friction reports before trends show up here.</p>
        <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
          <p style={{ margin: "0 0 16px", color: "var(--ink-soft)", lineHeight: 1.55 }}>
            Once teammates log slowdowns, you will see hours, cost, and where to focus first — no spreadsheets
            required.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn coral" onClick={() => setPage("submit")}>
              Report friction
            </button>
            {mayImpactReport ? (
              <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
                Generate impact report
              </button>
            ) : null}
            {mayOverviewToolbox ? (
              <button type="button" className="btn secondary" onClick={() => setPage("overview")}>
                Demo toolbox on Overview
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (isFilteredEmpty) {
    return (
      <div className="fade-in">
        <h1>Insights</h1>
        <p className="subtitle">No reports match the current filters.</p>
        <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
          <p style={{ margin: "0 0 16px", color: "var(--ink-soft)", lineHeight: 1.55 }}>
            Try widening the team, category, status, or severity filters to see data again.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => clearFilters()}>
              Clear filters
            </button>
            <button type="button" className="btn secondary" onClick={() => setPage("submit")}>
              Report friction
            </button>
            {mayImpactReport ? (
              <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
                Generate impact report
              </button>
            ) : null}
            {mayOverviewToolbox ? (
              <button type="button" className="btn secondary" onClick={() => setPage("overview")}>
                Overview demo toolbox
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1>Insights</h1>
          <p className="subtitle">Where time and money leak — filtered from live reports.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          {mayImpactReport ? (
            <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
              Generate impact report
            </button>
          ) : null}
          {mayRoadmap ? (
            <button type="button" className="btn secondary" onClick={() => setPage("roadmap")}>
              See fix roadmap →
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="card"
        style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}
        role="search"
        aria-label="Filter insights"
      >
        <div className="field" style={{ minWidth: 160, flex: "1 1 140px", margin: 0 }}>
          <label htmlFor="ins-team">Team</label>
          <select
            id="ins-team"
            className="select"
            value={filters.selectedTeam ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ selectedTeam: v === "" ? null : (v as Team) });
            }}
          >
            <option value="">All teams</option>
            {teamFilterOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 180, flex: "1 1 160px", margin: 0 }}>
          <label htmlFor="ins-cat">Category</label>
          <select
            id="ins-cat"
            className="select"
            value={filters.selectedCategory ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ selectedCategory: v === "" ? null : (v as FrictionCategory) });
            }}
          >
            <option value="">All categories</option>
            {FRICTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 140, flex: "1 1 120px", margin: 0 }}>
          <label htmlFor="ins-status">Status</label>
          <select
            id="ins-status"
            className="select"
            value={filters.selectedStatus ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ selectedStatus: v === "" ? null : (v as ReportStatus) });
            }}
          >
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 140, flex: "1 1 120px", margin: 0 }}>
          <label htmlFor="ins-sev">Severity</label>
          <select
            id="ins-sev"
            className="select"
            value={filters.selectedSeverity ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ selectedSeverity: v === "" ? null : (v as Severity) });
            }}
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => clearFilters()}
          disabled={!filtersActive}
          style={{ alignSelf: "flex-end" }}
        >
          Clear filters
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <InsightsMetricCard
          label="Monthly hours lost"
          value={formatHours(metrics.monthlyHoursLost)}
          explanation="Estimated hours across all reports in this view."
          impactLabel="Answers: How much time are we losing?"
          icon="◷"
          tone="coral"
          delay={0}
        />
        <InsightsMetricCard
          label="Monthly cost leakage"
          value={formatCurrency(metrics.monthlyCostLost, currencyCode)}
          explanation={`Blended rate ${formatCurrency(hourlyRate, currencyCode)}/hr (editable in Settings).`}
          impactLabel="Answers: What is this costing?"
          icon="$"
          tone="amber"
          delay={0.03}
        />
        <InsightsMetricCard
          label="Annualized risk"
          value={formatCurrency(metrics.annualizedCostLost, currencyCode)}
          explanation="Monthly cost × 12 — rough annual exposure."
          icon="◎"
          tone="amber"
          delay={0.06}
        />
        <InsightsMetricCard
          label="Open reports"
          value={openCount}
          explanation={`${openCount} with status Open · ${metrics.reportCount} reports in this view.`}
          impactLabel="Backlog still active"
          icon="◐"
          tone="lime"
          delay={0.09}
        />
        <InsightsMetricCard
          label="Most expensive category"
          value={metrics.topCategory ?? "—"}
          explanation={
            metrics.topCategory
              ? `About ${formatCurrency(topCatCost, currencyCode)} per month at current volume.`
              : "No category data in this view."
          }
          icon="▦"
          tone="coral"
          delay={0.12}
        />
        <InsightsMetricCard
          label="Highest-cost process"
          value={highestProcess.process || "—"}
          explanation={
            highestProcess.monthlyCost > 0
              ? `${formatCurrency(Math.round(highestProcess.monthlyCost), currencyCode)} per month aggregated.`
              : "No process data in this view."
          }
          impactLabel="Start investigations here"
          icon="→"
          tone="amber"
          delay={0.15}
        />
        <InsightsMetricCard
          label="Avg. friction score"
          value={avgScore.toLocaleString()}
          explanation="Higher = more monthly drag weighted by severity and frequency."
          icon="≈"
          tone="lime"
          delay={0.18}
        />
        <InsightsMetricCard
          label="High + critical"
          value={critHigh}
          explanation="Reports flagged high or critical severity."
          impactLabel="Triage these first"
          icon="!"
          tone="coral"
          delay={0.21}
        />
      </div>

      <motion.div
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, var(--paper-2) 0%, var(--surface) 100%)",
          borderColor: "var(--rule-strong)",
        }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>What this means</h2>
        <p style={{ margin: 0, fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6 }}>{summaryText}</p>
      </motion.div>

      <section className="card" style={{ marginBottom: 24, padding: "20px 22px" }} aria-labelledby="advanced-analytics-heading">
        <h2 id="advanced-analytics-heading" style={{ fontSize: 18, marginBottom: 10 }}>
          Savings &amp; resolution analytics
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
          All dollar figures are <strong>estimates</strong> from submitted reports and your blended hourly rate — not guaranteed savings.
        </p>
        <ul style={{ margin: "0 0 18px", paddingLeft: 20, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          <li>
            <strong>Potential savings</strong> assumes the selected roadmap bottlenecks (e.g. top 3 clusters) are fully resolved; real outcomes depend on scope and adoption.
          </li>
          <li>
            <strong>Resolved savings</strong> is estimated from reports marked <strong>Resolved</strong> — keep statuses current for a useful read.
          </li>
          <li>
            <strong>Use this to prioritize</strong> which operational fixes to assign first; pair with owners and re-measure after changes ship.
          </li>
        </ul>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Current est. leakage
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.totalMonthlyLeakage, currencyCode)}/mo
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              After top 3 fixes (est.)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.estimatedLeakageAfterTop3, currencyCode)}/mo
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--lime-soft)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Est. monthly savings (top 3)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums", color: "var(--sage)" }}>
              {formatCurrency(savingsModel.estimatedMonthlySavingsFromTop3, currencyCode)}/mo
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Est. annual savings (top 3)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.estimatedAnnualSavingsFromTop3, currencyCode)}/yr
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Resolved savings (est.)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.resolvedMonthlyCost, currencyCode)}/mo
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>
              {savingsModel.resolvedReportCount} resolved report{savingsModel.resolvedReportCount === 1 ? "" : "s"} ·{" "}
              {savingsModel.percentCostAddressed}% of modeled leakage
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Remaining open (est.)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.remainingOpenMonthlyCost, currencyCode)}/mo
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--rule)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Critical clusters (potential)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(savingsModel.potentialCriticalMonthlySavings, currencyCode)}/mo
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>
              {savingsModel.criticalRoadmapClusterCount} Critical-ranked{" "}
              {savingsModel.criticalRoadmapClusterCount === 1 ? "cluster" : "clusters"}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: 15, margin: "0 0 10px", fontWeight: 600 }}>Impact funnel</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.45 }}>
          Counts follow report statuses and clustered roadmap bottlenecks in this filtered view.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))",
            gap: 10,
            marginBottom: 22,
          }}
        >
          {funnelSteps.map((step) => (
            <div
              key={step.label}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--rule-strong)",
                background: "linear-gradient(180deg, var(--surface) 0%, var(--paper-2) 100%)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--ink-mute)", lineHeight: 1.35 }}>{step.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {step.kind === "currency"
                  ? formatCurrency(Math.round(step.value), currencyCode)
                  : step.value.toLocaleString()}
              </div>
              {step.kind === "currency" ? (
                <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>per month (est.)</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 20, marginBottom: 8 }}>
          <SavingsLeakageComparisonChart
            currentLeakage={savingsModel.totalMonthlyLeakage}
            afterTop3Leakage={savingsModel.estimatedLeakageAfterTop3}
            currency={currencyCode}
            title="Before / after (top 3 roadmap fixes)"
            summary="Compares total estimated monthly leakage in this view to a directional scenario where the three highest-ranked roadmap clusters are fully cleared."
          />
          {trendSeries.length > 0 ? (
            <ReportSubmissionTrendChart
              data={trendSeries}
              currency={currencyCode}
              title={`Reported friction over time (${trendBucket === "month" ? "by month" : "by week"})`}
              summary="Based on report createdAt timestamps in this view only — not full company telemetry. Bucket size picks week vs month from how spread out dates are."
            />
          ) : (
            <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>Not enough dated reports to plot a trend.</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {categoryChartData.length === 0 ? (
          <EmptyState
            title="No category hours to chart"
            description="Everything in this view nets to zero hours. Loosen filters or add reports that estimate monthly drag."
          >
            <button type="button" className="btn" onClick={() => clearFilters()}>
              Clear filters
            </button>
            <button type="button" className="btn secondary" onClick={() => setPage("submit")}>
              Report friction
            </button>
          </EmptyState>
        ) : (
          <CategoryHoursBarChart
            data={categoryChartData}
            title="Hours lost by category"
            summary="Which friction types consume the most time each month (sorted high to low)."
          />
        )}
        {teamCostData.length === 0 ? (
          <EmptyState
            title="No team dollar drag in this slice"
            description="Costs roll up using your blended hourly rate and monthly hours estimates. Filters may be trimming every team signal."
          >
            <button type="button" className="btn" onClick={() => clearFilters()}>
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <TeamCostBarChart
            data={teamCostData}
            title="Monthly cost by team"
            summary="Which teams carry the largest estimated dollar drag at the blended hourly rate."
            currency={currencyCode}
          />
        )}
      </div>

      <div style={{ marginBottom: 20, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
        {severityTotal === 0 ? (
          <EmptyState
            title="No severity data to plot"
            description="Severity counts rely on friction reports matching your filters. Try clearing filters or submit a scoped report."
          >
            <button type="button" className="btn" onClick={() => clearFilters()}>
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <SeverityDistributionChart
            data={severityData}
            title="Severity distribution"
            summary="How reports break down by disruption level — numbers repeated in the table for screen readers."
          />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>Process / tool cost ranking</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Grouped by tool or workflow</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 14px" }}>
          Ranked by estimated monthly cost. Use this to decide what to fix before one-off annoyances.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Process / tool</th>
                <th>Team</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Monthly hours</th>
                <th style={{ textAlign: "right" }}>Monthly cost</th>
              </tr>
            </thead>
            <tbody>
              {processRank.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--ink-mute)" }}>
                    No process clusters in this view.
                  </td>
                </tr>
              ) : (
                processRank.map((row) => (
                  <tr key={row.process}>
                    <td style={{ fontWeight: 500 }}>{row.process}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{row.teamLabel}</td>
                    <td>
                      <CategoryPill category={row.category} />
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatHours(row.monthlyHours)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(row.monthlyCost, currencyCode)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2>Recent reports</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{filtered.length} in this view</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>
          Latest submissions with estimated monthly cost (not one-off hours).
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Team</th>
                <th>Category</th>
                <th>Severity</th>
                <th style={{ textAlign: "right" }}>Monthly cost</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "16px 0", color: "var(--ink-mute)", fontWeight: 500 }}>
                    Nothing recent in this view — loosen filters or add a friction report from the Submit tab.
                  </td>
                </tr>
              )}
              {recent.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, maxWidth: 220 }}>{r.title}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{r.team}</td>
                  <td>
                    <CategoryPill category={r.category} />
                  </td>
                  <td>
                    <SeverityPill severity={r.severity} />
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(Math.round(calculateMonthlyCost(r, hourlyRate)), currencyCode)}
                  </td>
                  <td>
                    <StatusPill status={r.status} />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--ink-mute)", fontSize: 13, whiteSpace: "nowrap" }}>
                    {formatReportDate(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
