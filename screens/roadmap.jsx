/* global React, useStore, FIXES, CategoryPill, PriorityPill, Pill, HOURLY_RATE */
function RoadmapScreen() {
  const { totals } = useStore();

  // Re-rank with current drag
  const ranked = [...FIXES].map(f => {
    const dragHours = Math.round(totals.byCat[f.tag] || 0);
    const score = f.savesH + Math.round(dragHours / 3);
    return { ...f, dragHours, score, monthlyCost: f.savesH * HOURLY_RATE };
  }).sort((a, b) => b.score - a.score);

  const totalRecover = ranked.slice(0, 3).reduce((s, f) => s + f.savesH, 0);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1>Fix roadmap</h1>
          <p className="subtitle">Ranked by how much time and money they’d return.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>If we ship the top 3</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--sage)" }}>
            ~${((totalRecover * HOURLY_RATE * 12) / 1000).toFixed(0)}k / yr recovered
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ranked.map((f, i) => (
          <div key={f.id} className="card hoverable" style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr auto",
            gap: 20, alignItems: "flex-start",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: i === 0 ? "var(--coral-soft)" : i === 1 ? "var(--amber-soft)" : "var(--paper-2)",
              color: i === 0 ? "#9a3a2f" : i === 1 ? "#8a5816" : "var(--ink-soft)",
              border: "1px solid var(--rule-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 600,
            }}>
              {i + 1}
            </div>

            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <CategoryPill id={f.tag} />
                <PriorityPill priority={f.priority} />
                <Pill>Effort · {f.effort}</Pill>
                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{f.team}</span>
              </div>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.title}</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 3 }}>Why it matters</div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{f.problem}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 3 }}>Suggested fix</div>
                  <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>{f.suggestion}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 130 }}>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly cost</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: "var(--coral)", fontVariantNumeric: "tabular-nums" }}>
                ${f.monthlyCost.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{f.savesH}h/mo back</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.RoadmapScreen = RoadmapScreen;
