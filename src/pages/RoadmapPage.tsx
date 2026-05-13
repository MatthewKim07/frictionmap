import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import { InsightsMetricCard } from "@/components/dashboard/InsightsMetricCard";
import { CategoryPill, ImplementationDifficultyPill, RecommendationConfidencePill, RoadmapPriorityPill, SeverityPill, StatusPill } from "@/components/ui/pills";
import { DEFAULT_COMPANY_NAME } from "@/constants/companySettings";
import {
  FRICTION_CATEGORIES,
  REPORT_STATUSES,
  ROADMAP_PRIORITY_LEVELS,
} from "@/constants/friction";
import {
  calculateMonthlyCost,
  formatCurrency,
  formatFrequencyLabel,
  formatHours,
  formatReportDate,
} from "@/lib/frictionCalculations";
import {
  buildWhyRankedFirstExplanation,
  formatRoadmapItemCopySummary,
  formatRoadmapItemExportText,
  generateRoadmapItems,
} from "@/lib/roadmap";
import { useFrictionStore } from "@/store/frictionStore";
import type { DerivedRoadmapItem, FrictionCategory, ReportStatus, RoadmapPriorityLevel } from "@/types";

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  planned: "Planned",
  resolved: "Resolved",
};

type PriorityFilter = "all" | RoadmapPriorityLevel;
type CategoryFilter = "all" | FrictionCategory;
type StatusFilter = "all" | ReportStatus;
type RoadmapSort = "cost" | "hours" | "reports" | "score";

function previewFix(text: string, max = 96): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stripMarkdownBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* try fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function slugFilePart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "item";
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sortRoadmapItems(items: DerivedRoadmapItem[], sortBy: RoadmapSort): DerivedRoadmapItem[] {
  const next = [...items];
  switch (sortBy) {
    case "cost":
      next.sort((a, b) => b.monthlyCost - a.monthlyCost);
      break;
    case "hours":
      next.sort((a, b) => b.monthlyHours - a.monthlyHours);
      break;
    case "reports":
      next.sort((a, b) => b.relatedReports.length - a.relatedReports.length);
      break;
    case "score":
    default:
      next.sort((a, b) => b.priorityScore - a.priorityScore);
      break;
  }
  return next;
}

export function RoadmapPage() {
  const reports = useFrictionStore((s) => s.reports);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const companySettings = useFrictionStore((s) => s.companySettings);
  const currencyCode = companySettings.currencyCode;
  const orgTrim = companySettings.companyName.trim();
  const roadmapRec =
    orgTrim && orgTrim !== DEFAULT_COMPANY_NAME ? { organizationLabel: orgTrim } : undefined;

  const setPage = useFrictionStore((s) => s.setPage);
  const setClusterReportsStatus = useFrictionStore((s) => s.setClusterReportsStatus);
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<RoadmapSort>("score");
  const [actionNote, setActionNote] = useState<string | null>(null);

  const showNote = useCallback((msg: string) => {
    setActionNote(msg);
    window.setTimeout(() => setActionNote(null), 3200);
  }, []);

  const allItems = useMemo(
    () => generateRoadmapItems(reports, hourlyRate, currencyCode, roadmapRec),
    [reports, hourlyRate, currencyCode, orgTrim],
  );

  const topByScore = allItems[0] ?? null;

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (priorityFilter !== "all" && item.priorityLevel !== priorityFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    });
  }, [allItems, priorityFilter, categoryFilter, statusFilter]);

  const visible = useMemo(() => sortRoadmapItems(filtered, sortBy), [filtered, sortBy]);

  const metrics = useMemo(() => {
    const totalMonthly = visible.reduce((s, i) => s + i.monthlyCost, 0);
    const totalAnnual = visible.reduce((s, i) => s + i.annualCost, 0);
    const critHigh = visible.filter((i) => i.priorityLevel === "Critical" || i.priorityLevel === "High").length;
    const reportIds = new Set<string>();
    for (const item of visible) {
      for (const r of item.relatedReports) reportIds.add(r.id);
    }
    return {
      totalMonthly,
      totalAnnual,
      opportunityCount: visible.length,
      critHigh,
      reportsRepresented: reportIds.size,
    };
  }, [visible]);

  const filtersActive =
    priorityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || sortBy !== "score";

  const resetFilters = () => {
    setPriorityFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("score");
  };

  const topRecLine = topByScore
    ? `Start with ${topByScore.problemTitle} (${topByScore.process}) to address approximately ${formatCurrency(Math.round(topByScore.monthlyCost), currencyCode)}/month in cost leakage.`
    : null;

  const whyFirst = topByScore ? buildWhyRankedFirstExplanation(topByScore, currencyCode) : null;

  if (reports.length === 0) {
    return (
      <div className="fade-in">
        <h1>Fix Roadmap</h1>
        <p className="subtitle">A ranked action plan for reducing workflow drag.</p>
        <div className="card" style={{ maxWidth: 520, marginTop: 28, padding: 28 }}>
          <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            Roadmap items are built automatically from friction reports. Submit a report to see prioritized fix
            opportunities, savings estimates, and suggested next steps.
          </p>
          <button type="button" className="btn coral" style={{ marginTop: 20 }} onClick={() => setPage("submit")}>
            Report friction
          </button>
          <button type="button" className="btn secondary" style={{ marginTop: 12 }} onClick={() => setImpactReportModalOpen(true)}>
            Generate impact report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <header
        style={{
          marginBottom: 24,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <h1 style={{ marginBottom: 6 }}>Fix Roadmap</h1>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            A ranked action plan for reducing workflow drag.
          </p>
          {topRecLine && (
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink-soft)",
                maxWidth: 820,
                lineHeight: 1.55,
              }}
            >
              <span style={{ color: "var(--ink-mute)", fontWeight: 500 }}>Top recommendation: </span>
              {topRecLine}
            </p>
          )}
        </div>
        <button type="button" className="btn secondary" onClick={() => setImpactReportModalOpen(true)}>
          Generate impact report
        </button>
      </header>

      {whyFirst && topByScore && (
        <motion.section
          className="card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            marginBottom: 22,
            padding: "18px 20px",
            borderLeft: "4px solid var(--amber)",
            background: "var(--surface)",
          }}
          aria-label="Why the top roadmap item is ranked first"
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", letterSpacing: "0.02em" }}>
            Why this is ranked #1
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6 }}>{whyFirst}</p>
        </motion.section>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <InsightsMetricCard
          label="Potential monthly savings"
          value={formatCurrency(Math.round(metrics.totalMonthly), currencyCode)}
          explanation="Sum of estimated monthly cost leakage in the current list."
          icon="$"
          tone="coral"
          delay={0}
        />
        <InsightsMetricCard
          label="Annualized opportunity"
          value={formatCurrency(Math.round(metrics.totalAnnual), currencyCode)}
          explanation="If these clusters were fully addressed for a year."
          icon="12"
          tone="amber"
          delay={0.04}
        />
        <InsightsMetricCard
          label="Fix opportunities"
          value={metrics.opportunityCount}
          explanation="Distinct category + process clusters in view."
          icon="#"
          tone="lime"
          delay={0.08}
        />
        <InsightsMetricCard
          label="Critical / High"
          value={metrics.critHigh}
          explanation="Priority fixes needing leadership attention."
          icon="!"
          tone="coral"
          delay={0.12}
        />
        <InsightsMetricCard
          label="Reports in roadmap"
          value={metrics.reportsRepresented}
          explanation="Unique reports represented in the filtered list."
          icon="≡"
          tone="amber"
          delay={0.16}
        />
      </div>

      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: "16px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px 20px",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="roadmap-filter-priority" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>
            Priority
          </label>
          <select
            id="roadmap-filter-priority"
            className="select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          >
            <option value="all">All</option>
            {ROADMAP_PRIORITY_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="roadmap-filter-category" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>
            Category
          </label>
          <select
            id="roadmap-filter-category"
            className="select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          >
            <option value="all">All</option>
            {FRICTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="roadmap-filter-status" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>
            Status
          </label>
          <select
            id="roadmap-filter-status"
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            {REPORT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="roadmap-sort" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>
            Sort by
          </label>
          <select
            id="roadmap-sort"
            className="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as RoadmapSort)}
          >
            <option value="score">Priority score</option>
            <option value="cost">Highest cost</option>
            <option value="hours">Most hours lost</option>
            <option value="reports">Most reports</option>
          </select>
        </div>
        {filtersActive && (
          <button type="button" className="btn secondary" onClick={resetFilters} style={{ marginLeft: "auto" }}>
            Reset filters
          </button>
        )}
      </div>

      {actionNote && (
        <div
          role="status"
          style={{
            marginBottom: 14,
            fontSize: 14,
            color: "var(--sage)",
            fontWeight: 500,
          }}
        >
          {actionNote}
        </div>
      )}

      {visible.length === 0 && (
        <div className="card" style={{ padding: 28, textAlign: "center" }}>
          <p style={{ margin: 0, color: "var(--ink-soft)" }}>No roadmap items match these filters.</p>
          <button type="button" className="btn coral" style={{ marginTop: 16 }} onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visible.map((item, index) => {
          const expanded = expandedId === item.id;
          const rank = index + 1;
          const isTopRank = sortBy === "score" && rank === 1 && !filtersActive;

          return (
            <motion.article
              key={item.id}
              layout
              className="card hoverable"
              initial={false}
              animate={{
                boxShadow: isTopRank
                  ? "0 0 0 2px var(--amber-soft), var(--shadow-md)"
                  : "var(--shadow-sm)",
              }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                border: isTopRank ? "1px solid rgba(232, 155, 60, 0.45)" : "1px solid var(--rule)",
                background: isTopRank ? "var(--surface)" : undefined,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 16, alignItems: "start" }}>
                <div
                  aria-hidden
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: rank === 1 ? "var(--coral-soft)" : rank === 2 ? "var(--amber-soft)" : "var(--paper-2)",
                    color: rank === 1 ? "#9a3a2f" : rank === 2 ? "#8a5816" : "var(--ink-soft)",
                    border: "1px solid var(--rule-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {rank}
                </div>

                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    id={`roadmap-expand-${item.id}`}
                    aria-expanded={expanded}
                    aria-controls={`roadmap-panel-${item.id}`}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                      <CategoryPill category={item.category} />
                      <RoadmapPriorityPill level={item.priorityLevel} />
                      <StatusPill status={item.status} />
                      <span className="pill ink" style={{ fontSize: 12 }}>
                        <span className="dot" />
                        {item.relatedReports.length} related report{item.relatedReports.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.35 }}>
                      {item.problemTitle}
                    </h2>
                    <div style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 10 }}>
                      Process / tool: <strong style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{item.process}</strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-mute)" }}>
                          Monthly cost
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            color: "var(--coral)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatCurrency(Math.round(item.monthlyCost), currencyCode)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-mute)" }}>
                          Monthly hours
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {formatHours(item.monthlyHours)}
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-mute)" }}>
                          Suggested fix (preview)
                        </div>
                        <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{previewFix(item.suggestedFix)}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--amber)", fontWeight: 600 }}>
                      {expanded ? "Hide details" : "Show details"}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        id={`roadmap-panel-${item.id}`}
                        role="region"
                        aria-labelledby={`roadmap-expand-${item.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ paddingTop: 18, borderTop: "1px solid var(--rule)", marginTop: 14 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Suggested fix
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.suggestedFix}</p>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Why it matters
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.whyItMatters}</p>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 20 }}>
                            <div>
                              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Annualized cost leakage</div>
                              <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                {formatCurrency(Math.round(item.annualCost), currencyCode)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Teams involved</div>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>
                                {[...new Set(item.relatedReports.map((r) => r.team))].join(", ")}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                              Recommended first step
                            </div>
                            <div
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: "var(--lime-soft)",
                                border: "1px solid var(--rule)",
                                fontSize: 14,
                                color: "var(--ink-soft)",
                                lineHeight: 1.55,
                              }}
                            >
                              {item.firstStep}
                            </div>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                              Recommendation strength & effort
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <RecommendationConfidencePill level={item.recommendationConfidence} />
                              <ImplementationDifficultyPill level={item.difficulty} />
                              <span className="pill ink" style={{ fontSize: 12 }}>
                                <span className="dot" />
                                Timeline: {item.estimatedImplementationTime}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                              Implementation plan
                            </div>
                            <div
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: "var(--paper-2)",
                                border: "1px solid var(--rule)",
                                fontSize: 14,
                                color: "var(--ink-soft)",
                                lineHeight: 1.55,
                                whiteSpace: "pre-line",
                              }}
                            >
                              {item.implementationPlan}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 16,
                              marginBottom: 16,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Expected benefit (estimate)
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                                {stripMarkdownBold(item.expectedBenefit)}
                              </p>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Risk if ignored
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.riskIfIgnored}</p>
                            </div>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                              Adoption notes
                            </div>
                            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, whiteSpace: "pre-line" }}>
                              {item.adoptionNotes}
                            </p>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: 16,
                              marginBottom: 16,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Suggested owner
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.ownerSuggestion}</p>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 6 }}>
                                Success metric
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.successMetric}</p>
                            </div>
                          </div>

                          {item.detectedPatterns.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                                Pattern signals
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5 }}>
                                {item.detectedPatterns.map((p) => (
                                  <li key={p.id}>
                                    <strong style={{ fontWeight: 600 }}>{p.label}:</strong> {p.narrative}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                              Problem detail
                            </div>
                            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{item.problem}</p>
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px", color: "var(--ink-mute)" }}>
                              Related reports
                            </h3>
                            <div style={{ overflowX: "auto" }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 13,
                                  minWidth: 560,
                                }}
                              >
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
                                    <th scope="col" style={{ padding: "8px 10px 8px 0", color: "var(--ink-mute)", fontWeight: 600 }}>
                                      Title
                                    </th>
                                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                                      Team
                                    </th>
                                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                                      Severity
                                    </th>
                                    <th scope="col" style={{ padding: "8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                                      Frequency
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
                                  {item.relatedReports.map((r) => (
                                    <tr key={r.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                                      <td style={{ padding: "10px 10px 10px 0", fontWeight: 500 }}>{r.title}</td>
                                      <td style={{ padding: "10px 8px", color: "var(--ink-soft)" }}>{r.team}</td>
                                      <td style={{ padding: "10px 8px" }}>
                                        <SeverityPill severity={r.severity} />
                                      </td>
                                      <td style={{ padding: "10px 8px", color: "var(--ink-soft)" }}>
                                        {formatFrequencyLabel(r.frequency)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "10px 8px",
                                          fontVariantNumeric: "tabular-nums",
                                          color: "var(--ink-soft)",
                                        }}
                                      >
                                        {formatCurrency(Math.round(calculateMonthlyCost(r, hourlyRate)), currencyCode)}
                                      </td>
                                      <td style={{ padding: "10px 0 10px 8px" }}>
                                        <StatusPill status={r.status} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
                              Latest report in cluster:{" "}
                              {formatReportDate(
                                item.relatedReports.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b)).createdAt,
                              )}
                            </div>
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 8 }}>
                              Update cluster status
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {(["reviewing", "planned", "resolved"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  className={item.status === st ? "btn coral" : "btn secondary"}
                                  disabled={item.status === st}
                                  onClick={() => {
                                    setClusterReportsStatus(item.category, item.process, st);
                                    showNote(
                                      st === "resolved"
                                        ? `Marked cluster as ${STATUS_LABEL[st]}. Related reports updated — estimates appear under Insights → Resolution Activity.`
                                        : `Marked cluster as ${STATUS_LABEL[st]}. Related reports updated.`,
                                    );
                                  }}
                                >
                                  Mark {STATUS_LABEL[st].toLowerCase()}
                                </button>
                              ))}
                              <button
                                type="button"
                                className={item.status === "open" ? "btn coral" : "btn secondary"}
                                disabled={item.status === "open"}
                                onClick={() => {
                                  setClusterReportsStatus(item.category, item.process, "open");
                                  showNote("Cluster reopened — reports set to Open.");
                                }}
                              >
                                Mark open
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={async () => {
                                const ok = await copyToClipboard(formatRoadmapItemCopySummary(item, currencyCode));
                                showNote(ok ? "Summary copied to clipboard." : "Could not copy — select and copy manually.");
                              }}
                            >
                              Copy fix summary
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => {
                                downloadTextFile(`frictionmap-roadmap-${slugFilePart(item.problemTitle)}.txt`, formatRoadmapItemExportText(item, hourlyRate, currencyCode));
                                showNote("Exported roadmap item as text.");
                              }}
                            >
                              Export as text
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
