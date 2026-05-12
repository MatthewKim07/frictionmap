import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AppCurrencyCode } from "@/constants/currency";
import { DEFAULT_APP_CURRENCY } from "@/constants/currency";
import type { FrictionCategory } from "@/types";
import { categoryColorHex } from "@/lib/categoryMeta";
import { formatCurrency, formatHours } from "@/lib/frictionCalculations";
import type { Severity } from "@/types";

const TEAM_CHART_COLORS = ["#E45A4C", "#E89B3C", "#B6C84A", "#6E7A4A", "#c97a6b", "#a8943a"];

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#6E7A4A",
  medium: "#E89B3C",
  high: "#E45A4C",
  critical: "#8f2d24",
};

export function CategoryHoursBarChart({
  data,
  title,
  summary,
}: {
  data: { name: string; hours: number; category: FrictionCategory }[];
  title: string;
  summary: string;
}) {
  const sorted = [...data].sort((a, b) => b.hours - a.hours);
  if (!sorted.length) return null;

  return (
    <div className="card" role="region" aria-labelledby="chart-cat-hours-title">
      <div className="section-head">
        <h2 id="chart-cat-hours-title">{title}</h2>
      </div>
      <p id="chart-cat-hours-desc" style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>
        {summary}
      </p>
      <div style={{ width: "100%", height: Math.max(220, sorted.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={sorted} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--ink-mute)" }}
              tickFormatter={(v) => `${v}`}
              label={{ value: "Hours / month", position: "insideBottom", offset: -4, fill: "var(--ink-mute)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={148}
              tick={{ fontSize: 11, fill: "var(--ink)" }}
              interval={0}
            />
            <Tooltip
              formatter={(value: number) => [formatHours(value), "Hours lost"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--rule-strong)",
                fontSize: 13,
              }}
            />
            <Bar dataKey="hours" name="Hours" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={400}>
              {sorted.map((entry) => (
                <Cell key={entry.name} fill={categoryColorHex(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="insights-chart-legend" style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ink-soft)" }}>
        {sorted.slice(0, 5).map((row) => (
          <li key={row.name}>
            <strong style={{ color: "var(--ink)" }}>{row.name}</strong>: {formatHours(row.hours)} lost per month
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeamCostBarChart({
  data,
  title,
  summary,
  currency = DEFAULT_APP_CURRENCY,
}: {
  data: { name: string; cost: number }[];
  title: string;
  summary: string;
  currency?: AppCurrencyCode;
}) {
  const sorted = [...data].sort((a, b) => b.cost - a.cost);
  if (!sorted.length) return null;

  return (
    <div className="card" role="region" aria-labelledby="chart-team-cost-title">
      <div className="section-head">
        <h2 id="chart-team-cost-title">{title}</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>{summary}</p>
      <div style={{ width: "100%", height: Math.max(220, sorted.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={sorted} margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--ink-mute)" }}
              tickFormatter={(v) => formatCurrency(Number(v), currency)}
            />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "var(--ink)" }} interval={0} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value, currency), "Monthly cost"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--rule-strong)",
                fontSize: 13,
              }}
            />
            <Bar dataKey="cost" name="Cost" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={400}>
              {sorted.map((row, i) => (
                <Cell key={`${row.name}-${row.cost}-${i}`} fill={TEAM_CHART_COLORS[i % TEAM_CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ink-soft)" }}>
        {sorted.map((row) => (
          <li key={row.name}>
            <strong style={{ color: "var(--ink)" }}>{row.name}</strong>: {formatCurrency(row.cost, currency)} per month
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SeverityDistributionChart({
  data,
  title,
  summary,
}: {
  data: { label: string; count: number; severity: Severity }[];
  title: string;
  summary: string;
}) {
  const chartData = data.filter((d) => d.count > 0);
  const total = chartData.reduce((s, d) => s + d.count, 0);
  if (!total) return null;

  return (
    <div className="card" role="region" aria-labelledby="chart-severity-title">
      <div className="section-head">
        <h2 id="chart-severity-title">{title}</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>{summary}</p>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData as { label: string; count: number; severity: Severity }[]}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
              label={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.severity} fill={SEVERITY_COLOR[entry.severity]} stroke="var(--surface)" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => {
                const row = item?.payload as { label?: string } | undefined;
                return [`${value} ${value === 1 ? "report" : "reports"}`, row?.label ?? ""];
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--rule-strong)",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="table" style={{ marginTop: 8 }}>
        <caption style={{ textAlign: "left", fontSize: 12, color: "var(--ink-mute)", marginBottom: 8 }}>
          Severity breakdown ({total} {total === 1 ? "report" : "reports"})
        </caption>
        <thead>
          <tr>
            <th>Severity</th>
            <th style={{ textAlign: "right" }}>Count</th>
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.severity}>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: SEVERITY_COLOR[row.severity],
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  {row.label}
                </span>
              </td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.count}</td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {total ? `${Math.round((row.count / total) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
