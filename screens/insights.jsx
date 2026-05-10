/* global React, useStore, BarRow, CategoryPill, SeverityPill, Metric, catColor, catMeta, FREQ_PER_MONTH, HOURLY_RATE */
function InsightsScreen() {
  const { reports, totals, setPage } = useStore();

  const cats = Object.entries(totals.byCat).sort((a, b) => b[1] - a[1]);
  const teams = Object.entries(totals.byTeam).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;
  const maxTeam = teams[0]?.[1] || 1;

  const processes = [...reports].map(r => {
    const monthly = r.hours * (FREQ_PER_MONTH[r.frequency] || 4);
    return { ...r, monthly, cost: monthly * HOURLY_RATE };
  }).sort((a, b) => b.cost - a.cost).slice(0, 5);
  const maxProcessCost = processes[0]?.cost || 1;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1>Insights</h1>
          <p className="subtitle">Where time and money go this month.</p>
        </div>
        <button className="btn secondary" onClick={() => setPage("roadmap")}>See fix roadmap →</button>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="section-head">
            <h2>Hours lost by category</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{Math.round(maxCat)}h max</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cats.map(([cid, h]) => (
              <BarRow key={cid} name={catMeta(cid).label} value={Math.round(h)} max={Math.round(maxCat)} color={catColor(cid)} />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Hours lost by team</h2>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{teams.length} teams</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {teams.map(([t, h], i) => (
              <BarRow key={t} name={t} value={Math.round(h)} max={Math.round(maxTeam)}
                color={["#E45A4C", "#E89B3C", "#B6C84A", "#6E7A4A", "#E45A4C", "#E89B3C", "#B6C84A", "#6E7A4A"][i]} />
            ))}
          </div>
        </div>
      </div>

      {/* Cost by process */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h2>Highest-cost processes</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Monthly estimate</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {processes.map(p => {
            const pct = Math.max(2, Math.round((p.cost / maxProcessCost) * 100));
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{p.team}</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: pct + "%", background: catColor(p.cat) }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>${p.cost.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{Math.round(p.monthly)}h/mo</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent reports table */}
      <div className="card">
        <div className="section-head">
          <h2>Recent reports</h2>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{reports.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Team</th>
              <th>Category</th>
              <th>Severity</th>
              <th style={{ textAlign: "right" }}>Hours</th>
              <th style={{ textAlign: "right" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {reports.slice(0, 8).map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.title}</td>
                <td style={{ color: "var(--ink-soft)" }}>{r.team}</td>
                <td><CategoryPill id={r.cat} /></td>
                <td><SeverityPill level={r.severity} /></td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.hours}h</td>
                <td style={{ textAlign: "right", color: "var(--ink-mute)", fontSize: 13 }}>{r.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.InsightsScreen = InsightsScreen;
