import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { ResolutionContributionCalendarModel } from "@/lib/resolutionContributionCalendar";
import type { ContributionCalendarCell } from "@/lib/resolutionContributionCalendar";
import { resolutionTooltipLine } from "@/lib/resolutionAnalytics";
import { ResolutionLegend } from "@/components/resolution/ResolutionLegend";

/** FrictionMap palette: cream → lime → sage → amber → coral (not GitHub green). */
function cellPaint(c: ContributionCalendarCell): { bg: string; border: string; pattern?: string } {
  if (c.dayKind === "padding") {
    return { bg: "transparent", border: "1px dashed var(--rule)" };
  }
  if (c.dayKind === "future") {
    return {
      bg: "color-mix(in srgb, var(--paper-2) 88%, var(--ink) 12%)",
      border: "2px dotted color-mix(in srgb, var(--ink-mute) 55%, transparent)",
      pattern:
        "repeating-linear-gradient(-38deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 5px)",
    };
  }
  const levels: Record<number, { bg: string; border: string; pattern?: string }> = {
    0: {
      bg: "#f4f0e8",
      border: c.elapsedInSelectedYear ? "1px solid color-mix(in srgb, var(--ink-mute) 45%, transparent)" : "1px solid #e3ddd2",
    },
    1: { bg: "#e8f2dc", border: "1px solid #c5d4ae" },
    2: { bg: "#c5d9a8", border: "1px solid #9fb882" },
    3: { bg: "#e8c48a", border: "1px solid #c49a52" },
    4: { bg: "#e07a5f", border: "1px solid #9c3d2e" },
  };
  const base = levels[c.level] ?? levels[0]!;
  if (c.level >= 2 && c.resolvedCount > 0) {
    return { ...base, pattern: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0 1px, transparent 2px)" };
  }
  return base;
}

const DOW_SIDE = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

export function ResolutionHeatmap({
  model,
  captionId,
  size = "full",
  selectedDateKey = null,
  onSelectDateKey,
  formatMoney,
  endSlot,
}: {
  model: ResolutionContributionCalendarModel;
  captionId: string;
  size?: "full" | "compact";
  selectedDateKey?: string | null;
  onSelectDateKey?: (dateKey: string | null) => void;
  formatMoney: (n: number) => string;
  /** e.g. year list (Insights full view). */
  endSlot?: React.ReactNode;
}) {
  const { headline, columns, monthLabels, mode, yearTotals, emptyYearMessage, layout } = model;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{ left: number; top: number; text: string } | null>(null);

  const hideTip = useCallback(() => setTip(null), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hide = () => hideTip();
    el.addEventListener("scroll", hide, { passive: true });
    return () => el.removeEventListener("scroll", hide);
  }, [hideTip]);

  useEffect(() => {
    if (!tip) return;
    const hide = () => hideTip();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tip, hideTip]);

  /** GitHub-style: most recent week is on the right; scroll so “today” is visible. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    });
    return () => window.cancelAnimationFrame(id);
  }, [columns.length, layout, size]);

  const showTipForCell = (cell: ContributionCalendarCell, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTip({
      left: rect.left + rect.width / 2,
      top: rect.top,
      text: resolutionTooltipLine(cell, formatMoney, layout),
    });
  };

  const handleCellClick = (cell: ContributionCalendarCell) => {
    if (!onSelectDateKey) return;
    if (cell.dayKind === "padding" || cell.dayKind === "future") {
      onSelectDateKey(null);
      return;
    }
    onSelectDateKey(selectedDateKey === cell.dateKey ? null : cell.dateKey);
  };

  const handleCellKeyDown = (e: KeyboardEvent, cell: ContributionCalendarCell) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCellClick(cell);
    }
  };

  const summaryBits: string[] = [];
  if (mode === "year" && model.year != null) {
    summaryBits.push(`${headline}.`);
    if (yearTotals) {
      summaryBits.push(
        `Estimated monthly hours addressed: ${yearTotals.monthlyHoursAddressed.toFixed(1)}. Monthly cost addressed: ${formatMoney(yearTotals.monthlyCostAddressed)}. Annualized: ${formatMoney(yearTotals.annualizedCostAddressed)}.`,
      );
    }
    if (layout === "github-rolling") {
      summaryBits.push(
        "Grid shows about the last twelve months in UTC weeks, ending Saturday of this week; today is the last filled cell in the final column.",
      );
      summaryBits.push("Square intensity is relative to activity in this window (cost per day when available).");
    } else {
      summaryBits.push(
        "Square intensity reflects estimated monthly cost addressed per calendar day in this year, or count if no cost.",
      );
    }
  } else {
    summaryBits.push(`${headline}. Intensity is relative to activity in this rolling window.`);
  }

  return (
    <>
      <style>
        {`.resolution-github-cell:focus-visible {
          outline: 2px solid var(--coral);
          outline-offset: 1px;
        }`}
      </style>
      {tip
        ? createPortal(
            <div role="tooltip" className="resolution-github-tooltip" style={{ left: tip.left, top: tip.top }}>
              {tip.text}
            </div>,
            document.body,
          )
        : null}
      <div
        className={`resolution-github${size === "compact" ? " resolution-github--compact" : ""}`}
        role="group"
        aria-labelledby={`${captionId}-headline`}
      >
        <div className="resolution-github-toolbar">
          <p className="resolution-github-headline" id={`${captionId}-headline`}>
            {headline}
          </p>
        </div>

        {emptyYearMessage && mode === "year" ? (
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-mute)" }} role="status">
            {emptyYearMessage}
          </p>
        ) : null}

        {mode === "year" && yearTotals ? (
          <div
            className="resolution-year-metrics"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 12,
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>Monthly hours addressed</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>{yearTotals.monthlyHoursAddressed.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>Monthly cost addressed</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(yearTotals.monthlyCostAddressed)}/mo</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>Annualized cost addressed</div>
              <div style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(yearTotals.annualizedCostAddressed)}/yr</div>
            </div>
          </div>
        ) : null}

        <div className="resolution-github-outer-row">
          <div
            className={`resolution-github-board${size === "compact" ? " resolution-github-board--compact" : ""}`}
          >
            <div className="resolution-github-frame">
              <div className="resolution-github-dow" aria-hidden="true">
                {DOW_SIDE.map((lab, i) => (
                  <span key={i} className="resolution-github-dow-label">
                    {lab}
                  </span>
                ))}
              </div>

              <div className="resolution-github-scroll" ref={scrollRef}>
                <div className="resolution-github-cols">
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="resolution-github-col">
                      <div className="resolution-github-month-slot">
                        {monthLabels.find((m) => m.columnIndex === colIdx)?.label ?? "\u00a0"}
                      </div>
                      {col.map((cell, rowIdx) => {
                        const paint = cellPaint(cell);
                        const selected = selectedDateKey === cell.dateKey;
                        return (
                          <button
                            key={`${cell.dateKey}-${rowIdx}`}
                            type="button"
                            aria-label={cell.label}
                            aria-pressed={selected}
                            className={`resolution-github-cell${selected ? " resolution-github-cell--selected" : ""}${cell.dayKind === "future" ? " resolution-github-cell--future" : ""}${cell.dayKind === "padding" ? " resolution-github-cell--padding" : ""}${cell.dayKind === "eligible" && cell.elapsedInSelectedYear ? " resolution-github-cell--elapsed" : ""}`}
                            style={{
                              background: paint.bg,
                              backgroundImage: paint.pattern,
                              border: paint.border,
                              boxShadow: cell.dayKind === "future" ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : undefined,
                              opacity: cell.dayKind === "future" ? 0.55 : 1,
                              cursor: cell.dayKind === "padding" || cell.dayKind === "future" ? "default" : "pointer",
                            }}
                            onPointerEnter={(e) => showTipForCell(cell, e.currentTarget)}
                            onPointerLeave={hideTip}
                            onClick={() => handleCellClick(cell)}
                            onKeyDown={(e) => handleCellKeyDown(e, cell)}
                          >
                            <span className="visually-hidden">{cell.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {size === "full" ? (
              <div className="resolution-github-footer">
                <span className="resolution-github-learn">
                  Hover or focus a square for details. Click an active day to see resolved frictions below. Upcoming days in
                  the current week are inactive and excluded from totals.
                </span>
                <ResolutionLegend />
              </div>
            ) : null}
          </div>

          {endSlot ? (
            <div className="resolution-github-end-slot" style={{ flex: "0 0 auto" }}>
              {endSlot}
            </div>
          ) : null}
        </div>

        <p className="visually-hidden" id={captionId}>
          {summaryBits.join(" ")}
        </p>
      </div>
    </>
  );
}
