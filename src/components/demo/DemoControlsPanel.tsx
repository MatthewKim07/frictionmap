import { useEffect, useState } from "react";

import { MAX_HOURLY_RATE, MIN_HOURLY_RATE } from "@/constants/friction";
import { DEMO_SCENARIO_IDS, DEMO_SCENARIO_LABELS, DEMO_SCENARIO_SHORT, type DemoScenarioId } from "@/data/demoScenarioTypes";
import { useFrictionStore } from "@/store/frictionStore";

export function DemoControlsPanel() {
  const demoScenarioId = useFrictionStore((s) => s.demoScenarioId);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const loadDemoScenario = useFrictionStore((s) => s.loadDemoScenario);
  const setHourlyRate = useFrictionStore((s) => s.setHourlyRate);
  const resetDemoData = useFrictionStore((s) => s.resetDemoData);

  const [rateDraft, setRateDraft] = useState(String(hourlyRate));

  useEffect(() => {
    setRateDraft(String(hourlyRate));
  }, [hourlyRate]);

  const scenarioChange = (next: DemoScenarioId) => {
    if (next === demoScenarioId) return;
    if (
      window.confirm(
        `Load “${DEMO_SCENARIO_LABELS[next]}”? This replaces all reports with pre-built demo friction data.`,
      )
    ) {
      loadDemoScenario(next);
    }
  };

  const commitRate = () => {
    const n = Number(rateDraft.replace(/,/g, "").trim());
    setHourlyRate(Number.isFinite(n) ? n : hourlyRate);
  };

  return (
    <aside
      className="demo-controls-panel card fade-in"
      aria-labelledby="demo-controls-heading"
      style={{
        padding: "20px 22px",
        marginBottom: 28,
        borderLeft: "4px solid var(--lime)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 220px" }}>
          <h2 id="demo-controls-heading" style={{ fontSize: 17, marginBottom: 6 }}>
            Demo &amp; settings
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>
            Switch datasets for judges, tweak economics, or reset to the baseline for the selected scenario.
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={() => resetDemoData()} style={{ flexShrink: 0 }}>
          Reset to scenario baseline
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: "16px 20px",
          marginTop: 20,
          alignItems: "end",
        }}
      >
        <div className="field">
          <label htmlFor="demo-scenario-picker">Demo scenario</label>
          <select
            id="demo-scenario-picker"
            className="select"
            value={demoScenarioId}
            onChange={(e) => scenarioChange(e.target.value as DemoScenarioId)}
          >
            {DEMO_SCENARIO_IDS.map((id) => (
              <option key={id} value={id}>
                {DEMO_SCENARIO_LABELS[id]}
              </option>
            ))}
          </select>
          <p className="hint" style={{ marginTop: 6 }}>
            {DEMO_SCENARIO_SHORT[demoScenarioId]}
          </p>
        </div>

        <div className="field">
          <label htmlFor="demo-hourly-rate">Blended hourly cost (USD)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
            <input
              id="demo-hourly-rate"
              className="input"
              type="number"
              min={MIN_HOURLY_RATE}
              max={MAX_HOURLY_RATE}
              step={1}
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              onBlur={commitRate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRate();
              }}
              aria-describedby="demo-hourly-hint"
            />
            <span className="hint" style={{ alignSelf: "center" }} id="demo-hourly-hint">
              {`${MIN_HOURLY_RATE}–${MAX_HOURLY_RATE}`} USD · drives monthly cost estimates
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
