import { useMemo } from "react";

import { CategoryPill, RoadmapPriorityPill } from "@/components/ui/pills";
import { Pill } from "@/components/ui/Pill";
import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import { filterReports } from "@/lib/frictionCalculations";
import { generateRoadmapItems } from "@/lib/roadmap";
import { useFrictionStore } from "@/store/frictionStore";

export function RoadmapPage() {
  const reports = useFrictionStore((s) => s.reports);
  const filters = useFrictionStore((s) => s.filters);

  const filtered = useMemo(() => filterReports(reports, filters), [reports, filters]);
  const ranked = useMemo(() => generateRoadmapItems(filtered), [filtered]);

  const totalRecoverAnnual = useMemo(
    () => ranked.slice(0, 3).reduce((s, row) => s + row.monthlyHours * AVERAGE_HOURLY_COST * 12, 0),
    [ranked],
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1>Fix roadmap</h1>
          <p className="subtitle">Ranked by how much time and money they’d return.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>If we ship the top 3 clusters</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--sage)" }}>
            ~${(totalRecoverAnnual / 1000).toFixed(0)}k / yr addressable
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>
        Derived from {filtered.length} report{filtered.length === 1 ? "" : "s"} in the current filter.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ranked.map((f, i) => (
          <div
            key={f.id}
            className="card hoverable"
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: i === 0 ? "var(--coral-soft)" : i === 1 ? "var(--amber-soft)" : "var(--paper-2)",
                color: i === 0 ? "#9a3a2f" : i === 1 ? "#8a5816" : "var(--ink-soft)",
                border: "1px solid var(--rule-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {i + 1}
            </div>

            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <CategoryPill category={f.category} />
                <RoadmapPriorityPill level={f.priorityLevel} />
                <Pill>{f.relatedReports.length} related reports</Pill>
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.process}</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 3 }}>Why it matters</div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{f.whyItMatters}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 3 }}>Suggested fix</div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{f.suggestedFix}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 130 }}>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly cost</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "var(--coral)", fontVariantNumeric: "tabular-nums" }}>
                ${Math.round(f.monthlyCost).toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
                {Math.round(f.monthlyHours)}h/mo lost
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
