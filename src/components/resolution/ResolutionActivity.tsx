import { useEffect, useMemo, useState } from "react";

import type { AppCurrencyCode } from "@/constants/currency";
import { ResolutionHeatmap } from "@/components/resolution/ResolutionHeatmap";
import { ResolutionDayActivityPanel } from "@/components/resolution/ResolutionDayActivityPanel";
import { ResolutionSummaryCards } from "@/components/resolution/ResolutionSummaryCards";
import { RecentWinsList } from "@/components/resolution/RecentWinsList";
import { formatCurrency } from "@/lib/frictionCalculations";
import {
  buildContributionCalendar,
  getAvailableResolutionYears,
  getRecentResolvedReports,
  getResolutionSummary,
  getResolvedImpactByProcess,
  getResolvedImpactByTeam,
  type ContributionCalendarCell,
} from "@/lib/resolutionAnalytics";
import type { FrictionReport } from "@/types";

import { ResolutionYearSelector } from "@/components/resolution/ResolutionYearSelector";

export function ResolutionActivity({
  reports,
  hourlyRate,
  currencyCode,
  organizationStartDate,
}: {
  reports: FrictionReport[];
  hourlyRate: number;
  currencyCode: AppCurrencyCode;
  /** UTC YYYY-MM-DD — first year shown in the activity list. */
  organizationStartDate: string;
}) {
  const summary = useMemo(() => getResolutionSummary(reports, hourlyRate), [reports, hourlyRate]);
  const formatMoney = useMemo(() => (n: number) => formatCurrency(Math.round(n), currencyCode), [currencyCode]);

  const currentYear = new Date().getUTCFullYear();
  const years = useMemo(
    () => getAvailableResolutionYears(organizationStartDate, currentYear),
    [organizationStartDate, currentYear],
  );

  const [selectedYear, setSelectedYear] = useState(currentYear);
  useEffect(() => {
    if (!years.includes(selectedYear)) {
      setSelectedYear(currentYear);
    }
  }, [years, selectedYear, currentYear]);

  const heatmapModel = useMemo(
    () => buildContributionCalendar(reports, hourlyRate, { mode: "year", year: selectedYear }, formatMoney),
    [reports, hourlyRate, selectedYear, formatMoney],
  );

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const selectedHeatmapCell = useMemo((): ContributionCalendarCell | null => {
    if (!selectedDateKey) return null;
    for (const col of heatmapModel.columns) {
      const c = col.find((x) => x.dateKey === selectedDateKey);
      if (c) return c;
    }
    return null;
  }, [heatmapModel, selectedDateKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDateKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!selectedDateKey) return;
    const el = document.getElementById("resolution-day-activity-panel");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedDateKey]);

  const recent = useMemo(() => getRecentResolvedReports(reports, 12), [reports]);
  const byTeam = useMemo(() => getResolvedImpactByTeam(reports, hourlyRate).slice(0, 6), [reports, hourlyRate]);
  const byProcess = useMemo(() => getResolvedImpactByProcess(reports, hourlyRate).slice(0, 6), [reports, hourlyRate]);

  const captionId = "resolution-heatmap-caption";
  const yearNav = (
    <ResolutionYearSelector
      years={years}
      selectedYear={selectedYear}
      onSelectYear={(y) => {
        setSelectedYear(y);
        setSelectedDateKey(null);
      }}
      idPrefix={captionId}
    />
  );

  return (
    <section className="card" style={{ marginBottom: 24, padding: "20px 22px" }} aria-labelledby="resolution-activity-heading">
      <h2 id="resolution-activity-heading" style={{ fontSize: 18, marginBottom: 8 }}>
        Resolution Activity
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
        Directional view of friction removed over time (UTC calendar days). Dollar and hour figures are <strong>estimates</strong> from submitted reports and your blended rate — not guaranteed savings. Years start from your{" "}
        <strong>organization start date</strong> in Settings.
      </p>

      <ResolutionSummaryCards summary={summary} currencyCode={currencyCode} />

      <div style={{ marginTop: 22 }}>
        <h3 style={{ fontSize: 15, margin: "0 0 6px", fontWeight: 600 }}>Resolution calendar</h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          <strong>Current UTC year:</strong> GitHub-style rolling window — about the last twelve months in full UTC weeks, ending Saturday of this week; <strong>today</strong> is the last active cell in the rightmost column. Older years use a January–December grid. Intensity reflects estimated monthly <strong>cost</strong> addressed per day in the visible window (or count if there is no cost signal). Upcoming days in the current week are inactive and excluded from totals.
        </p>
        <ResolutionHeatmap
          model={heatmapModel}
          captionId={captionId}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={setSelectedDateKey}
          formatMoney={formatMoney}
          endSlot={yearNav}
        />
        {selectedHeatmapCell && selectedHeatmapCell.dayKind === "eligible" ? (
          <ResolutionDayActivityPanel
            cell={selectedHeatmapCell}
            hourlyRate={hourlyRate}
            currencyCode={currencyCode}
            onClose={() => setSelectedDateKey(null)}
          />
        ) : null}
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
