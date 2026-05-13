import type { AppCurrencyCode } from "@/constants/currency";
import { formatCurrency } from "@/lib/frictionCalculations";
import type { HeatmapCell } from "@/lib/resolutionAnalytics";
import { RecentWinsList } from "@/components/resolution/RecentWinsList";

export function ResolutionDayActivityPanel({
  cell,
  hourlyRate,
  currencyCode,
  onClose,
}: {
  cell: HeatmapCell;
  hourlyRate: number;
  currencyCode: AppCurrencyCode;
  onClose: () => void;
}) {
  const n = cell.resolvedCount;
  const summary =
    n === 0
      ? "No frictions were resolved on this day (UTC)."
      : `${n.toLocaleString()} friction${n === 1 ? "" : "s"} resolved · est. ${cell.hoursSaved.toFixed(1)} hrs/mo and ${formatCurrency(cell.costSaved, currencyCode)}/mo cost addressed (directional).`;

  return (
    <section
      id="resolution-day-activity-panel"
      className="resolution-day-activity"
      style={{
        marginTop: 18,
        padding: "18px 20px",
        borderRadius: 14,
        border: "1px solid var(--rule-strong)",
        background: "var(--surface)",
      }}
      aria-labelledby="resolution-day-activity-title"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 id="resolution-day-activity-title" style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
            Resolution activity
          </h3>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{cell.prettyDate}</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5, maxWidth: 640 }}>{summary}</p>
        </div>
        <button type="button" className="btn secondary" style={{ flexShrink: 0 }} onClick={onClose}>
          Close
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {n === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
            Pick another day on the calendar above, or resolve friction reports to see them here.
          </p>
        ) : (
          <RecentWinsList reports={cell.reports} hourlyRate={hourlyRate} currencyCode={currencyCode} limit={40} />
        )}
      </div>
    </section>
  );
}
