import type { AppCurrencyCode } from "@/constants/currency";
import { calculateMonthlyCost, calculateMonthlyHours, formatCurrency, formatHours, formatReportDate } from "@/lib/frictionCalculations";
import { resolutionDateKeyForReport } from "@/lib/resolutionAnalytics";
import type { FrictionReport } from "@/types";
import { CategoryPill } from "@/components/ui/pills";

export function RecentWinsList({
  reports,
  hourlyRate,
  currencyCode,
  limit = 8,
}: {
  reports: FrictionReport[];
  hourlyRate: number;
  currencyCode: AppCurrencyCode;
  limit?: number;
}) {
  if (reports.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-mute)" }}>
        No resolved frictions in this view yet — when clusters or reports move to Resolved, they will appear here.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
        <caption className="visually-hidden">Recently resolved friction reports</caption>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
            <th scope="col" style={{ padding: "6px 8px 6px 0", color: "var(--ink-mute)", fontWeight: 600 }}>
              Title
            </th>
            <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
              Team
            </th>
            <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
              Category
            </th>
            <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
              Process
            </th>
            <th scope="col" style={{ padding: "6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
              Resolved
            </th>
            <th scope="col" style={{ padding: "6px 0 6px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
              Est. addressed
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.slice(0, limit).map((r) => {
            const dk = resolutionDateKeyForReport(r);
            const hrs = calculateMonthlyHours(r);
            const cost = Math.round(calculateMonthlyCost(r, hourlyRate));
            return (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                <td style={{ padding: "9px 8px 9px 0", fontWeight: 500, maxWidth: 200 }}>{r.title}</td>
                <td style={{ padding: "9px 8px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{r.team}</td>
                <td style={{ padding: "9px 8px" }}>
                  <CategoryPill category={r.category} />
                </td>
                <td style={{ padding: "9px 8px", color: "var(--ink-soft)" }}>{r.process}</td>
                <td style={{ padding: "9px 8px", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                  {dk ? formatReportDate(`${dk}T12:00:00.000Z`) : "—"}
                </td>
                <td style={{ padding: "9px 0 9px 8px", fontVariantNumeric: "tabular-nums", color: "var(--ink-soft)" }}>
                  {formatHours(hrs)}/mo · {formatCurrency(cost, currencyCode)}/mo
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
