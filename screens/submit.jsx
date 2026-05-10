/* global React, useStore, CATEGORIES, TEAMS, TOOLS, FREQ, SEVERITY_LABELS, CategoryPill, SeverityPill, Pill, FREQ_PER_MONTH, HOURLY_RATE */
const { useState: useStateSubmit } = React;

function SubmitScreen() {
  const { addReport, setPage } = useStore();
  const [form, setForm] = useStateSubmit({
    intent: "",
    blocker: "",
    cat: "data-entry",
    team: "Finance",
    tool: "NetSuite",
    hours: 2.0,
    frequency: "Weekly",
    severity: 3,
    suggestion: "",
  });
  const [submitted, setSubmitted] = useStateSubmit(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit(e) {
    e.preventDefault();
    const r = addReport({
      title: form.blocker || form.intent || "Untitled friction",
      cat: form.cat, team: form.team, tool: form.tool,
      hours: parseFloat(form.hours) || 1,
      frequency: form.frequency,
      severity: parseInt(form.severity),
      suggestion: form.suggestion,
    });
    setSubmitted(r);
  }

  if (submitted) {
    return (
      <div className="fade-in">
        <h1>Thanks — your report is in.</h1>
        <p className="subtitle">It’s now part of this month’s insights.</p>

        <div className="card" style={{ marginTop: 24, maxWidth: 640 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <CategoryPill id={submitted.cat} />
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>ID · {submitted.id.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>{submitted.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            <Pill>{submitted.team}</Pill>
            <Pill>{submitted.tool}</Pill>
            <Pill>{submitted.frequency}</Pill>
            <SeverityPill level={submitted.severity} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn" onClick={() => setPage("insights")}>View insights →</button>
            <button className="btn secondary" onClick={() => { setSubmitted(null); setForm(f => ({ ...f, intent: "", blocker: "", suggestion: "" })); }}>
              Report another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const monthlyHours = Math.round(form.hours * (FREQ_PER_MONTH[form.frequency] || 4));
  const monthlyCost = monthlyHours * HOURLY_RATE;

  return (
    <div className="fade-in">
      <h1>Report friction</h1>
      <p className="subtitle">Takes about 30 seconds. Anonymous to your team.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, marginTop: 28 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="field">
            <label>What got slowed down?</label>
            <input className="input" value={form.intent} onChange={e => set("intent", e.target.value)}
              placeholder="e.g. closing the Q3 books" />
          </div>

          <div className="field">
            <label>What caused the slowdown?</label>
            <textarea className="textarea" value={form.blocker} onChange={e => set("blocker", e.target.value)}
              placeholder="One sentence is fine." />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Team</label>
              <select className="select" value={form.team} onChange={e => set("team", e.target.value)}>
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={form.cat} onChange={e => set("cat", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tool or process</label>
              <select className="select" value={form.tool} onChange={e => set("tool", e.target.value)}>
                {TOOLS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>How often?</label>
              <div className="segmented">
                {FREQ.map(f => (
                  <button type="button" key={f}
                    className={form.frequency === f ? "active" : ""}
                    onClick={() => set("frequency", f)}>{f}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label>Time lost — <strong>{form.hours}h</strong> per occurrence</label>
            <input className="range" type="range" min="0.25" max="12" step="0.25"
              value={form.hours} onChange={e => set("hours", e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-mute)" }}>
              <span>15 min</span><span>4h</span><span>8h</span><span>12h+</span>
            </div>
          </div>

          <div className="field">
            <label>Severity</label>
            <div className="sev-group">
              {[1, 2, 3, 4].map(s => (
                <button type="button" key={s}
                  className={"sev-chip" + (parseInt(form.severity) === s ? " active" : "")}
                  onClick={() => set("severity", s)}>
                  <span className="sev-label">Level {s}</span>
                  <span>{SEVERITY_LABELS[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Suggested fix <span className="hint">— optional</span></label>
            <textarea className="textarea" value={form.suggestion} onChange={e => set("suggestion", e.target.value)}
              placeholder="If you had a magic wand…" />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Anonymous · visible in aggregate</span>
            <button className="btn coral" type="submit">Submit report</button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100, alignSelf: "flex-start" }}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 10 }}>Preview</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CategoryPill id={form.cat} />
              <SeverityPill level={parseInt(form.severity)} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, marginBottom: 12, minHeight: 44 }}>
              {form.blocker || form.intent || "Your report title will appear here."}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <Pill>{form.team}</Pill>
              <Pill>{form.tool}</Pill>
              <Pill>{form.frequency}</Pill>
            </div>
            <div style={{ display: "flex", gap: 14, borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly hours</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--coral)" }}>{monthlyHours}h</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly cost</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>${monthlyCost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

window.SubmitScreen = SubmitScreen;
