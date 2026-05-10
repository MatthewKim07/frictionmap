/* global React, useStore, Metric, CategoryPill, SeverityPill, BarRow, catColor, catMeta */
function LandingScreen() {
  const { totals, setPage, reports } = useStore();

  // Top friction this week — top 4 by per-report monthly hours
  const top = [...reports].sort((a, b) => {
    const m = { Daily: 22, Weekly: 4, Monthly: 1, "One-off": 1 };
    return b.hours * (m[b.frequency] || 4) - a.hours * (m[a.frequency] || 4);
  }).slice(0, 4);

  // Build small bar chart from byCat top 5
  const cats = Object.entries(totals.byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = cats[0]?.[1] || 1;

  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h1>FrictionMap</h1>
        <p className="subtitle" style={{ maxWidth: 560 }}>
          Find the hidden drag slowing your team down.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn coral" onClick={() => setPage("submit")}>Report friction</button>
          <button className="btn secondary" onClick={() => setPage("insights")}>View insights</button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <Metric
          label="Hours lost this month"
          value={totals.hours.toLocaleString() + "h"}
          sub="across all teams"
          icon="●" tone="coral"
        />
        <Metric
          label="Estimated cost"
          value={"$" + (totals.cost / 1000).toFixed(1) + "k"}
          sub={`at $${HOURLY_RATE}/hr blended`}
          icon="$" tone="amber"
        />
        <Metric
          label="Open friction reports"
          value={totals.count}
          sub="anonymous + aggregated"
          icon="◐" tone="lime"
        />
      </div>

      {/* Top friction + chart */}
      <div className="grid-2">
        <div className="card">
          <div className="section-head">
            <h2>Top friction this week</h2>
            <button className="link" onClick={() => setPage("insights")}>See all →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {top.map(r => (
              <div key={r.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12, alignItems: "center",
                paddingBottom: 12,
                borderBottom: "1px solid var(--rule)",
              }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <CategoryPill id={r.cat} />
                    <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{r.team}</span>
                  </div>
                </div>
                <SeverityPill level={r.severity} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Hours lost by category</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Last 30 days</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
            {cats.map(([cid, h]) => (
              <BarRow key={cid} name={catMeta(cid).label} value={Math.round(h)} max={Math.round(max)} color={catColor(cid)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.LandingScreen = LandingScreen;
