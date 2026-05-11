import { useState, type FormEvent } from "react";

import { CategoryPill, SeverityPill } from "@/components/ui/pills";
import { Pill } from "@/components/ui/Pill";
import {
  AVERAGE_HOURLY_COST,
  FREQUENCIES,
  FRICTION_CATEGORIES,
  PROCESS_OPTIONS,
  SEVERITIES,
  TEAMS,
} from "@/constants/friction";
import { calculateMonthlyCost, calculateMonthlyHours } from "@/lib/frictionCalculations";
import { useFrictionStore } from "@/store/frictionStore";
import type { FrictionCategory, FrictionReport, Frequency, Severity, Team } from "@/types";

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function formatFrequency(f: Frequency): string {
  return f === "once" ? "Once" : f.charAt(0).toUpperCase() + f.slice(1);
}

export function SubmitPage() {
  const addReport = useFrictionStore((s) => s.addReport);
  const setPage = useFrictionStore((s) => s.setPage);

  const [form, setForm] = useState({
    intent: "",
    blocker: "",
    category: "Manual data entry" as FrictionCategory,
    team: "Finance" as Team,
    process: "NetSuite",
    timeLostHours: 2.0,
    frequency: "weekly" as Frequency,
    severity: "high" as Severity,
    suggestion: "",
  });

  const [submitted, setSubmitted] = useState<FrictionReport | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const title = form.blocker || form.intent || "Untitled friction";
    const description = [form.intent, form.blocker].filter(Boolean).join(" — ") || "";
    const r = addReport({
      title,
      description,
      category: form.category,
      team: form.team,
      process: form.process,
      timeLostHours: Number(form.timeLostHours) || 1,
      frequency: form.frequency,
      severity: form.severity,
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
            <CategoryPill category={submitted.category} />
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>ID · {submitted.id.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>{submitted.title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            <Pill>{submitted.team}</Pill>
            <Pill>{submitted.process}</Pill>
            <Pill>{formatFrequency(submitted.frequency)}</Pill>
            <SeverityPill severity={submitted.severity} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn" onClick={() => setPage("insights")}>
              View insights →
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setSubmitted(null);
                setForm((f) => ({ ...f, intent: "", blocker: "", suggestion: "" }));
              }}
            >
              Report another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const previewReport: FrictionReport = {
    id: "preview",
    title: "",
    description: "",
    category: form.category,
    team: form.team,
    process: form.process,
    timeLostHours: form.timeLostHours,
    frequency: form.frequency,
    severity: form.severity,
    suggestion: "",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  const monthlyHours = Math.round(calculateMonthlyHours(previewReport));
  const monthlyCost = calculateMonthlyCost(previewReport, AVERAGE_HOURLY_COST);

  return (
    <div className="fade-in">
      <h1>Report friction</h1>
      <p className="subtitle">Takes about 30 seconds. Anonymous to your team.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, marginTop: 28 }}
      >
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="field">
            <label htmlFor="fm-intent">What got slowed down?</label>
            <input
              id="fm-intent"
              className="input"
              value={form.intent}
              onChange={(e) => set("intent", e.target.value)}
              placeholder="e.g. closing the Q3 books"
            />
          </div>

          <div className="field">
            <label htmlFor="fm-blocker">What caused the slowdown?</label>
            <textarea
              id="fm-blocker"
              className="textarea"
              value={form.blocker}
              onChange={(e) => set("blocker", e.target.value)}
              placeholder="One sentence is fine."
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="fm-team">Team</label>
              <select
                id="fm-team"
                className="select"
                value={form.team}
                onChange={(e) => set("team", e.target.value as Team)}
              >
                {TEAMS.map((t) => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fm-category">Category</label>
              <select
                id="fm-category"
                className="select"
                value={form.category}
                onChange={(e) => set("category", e.target.value as FrictionCategory)}
              >
                {FRICTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fm-process">Tool or process</label>
              <select
                id="fm-process"
                className="select"
                value={form.process}
                onChange={(e) => set("process", e.target.value)}
              >
                {PROCESS_OPTIONS.map((t) => (
                  <option key={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label id="fm-frequency-label">How often?</label>
              <div className="segmented" role="group" aria-labelledby="fm-frequency-label">
                {FREQUENCIES.map((f) => (
                  <button
                    type="button"
                    key={f}
                    className={form.frequency === f ? "active" : ""}
                    onClick={() => set("frequency", f)}
                  >
                    {formatFrequency(f)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="fm-hours">
              Time lost — <strong>{form.timeLostHours}h</strong> per occurrence
            </label>
            <input
              id="fm-hours"
              className="range"
              type="range"
              min={0.25}
              max={12}
              step={0.25}
              value={form.timeLostHours}
              onChange={(e) => set("timeLostHours", Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-mute)" }}>
              <span>15 min</span>
              <span>4h</span>
              <span>8h</span>
              <span>12h+</span>
            </div>
          </div>

          <div className="field">
            <label>Severity</label>
            <div className="sev-group">
              {SEVERITIES.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`sev-chip${form.severity === s ? " active" : ""}`}
                  onClick={() => set("severity", s)}
                >
                  <span className="sev-label">{s}</span>
                  <span>{SEVERITY_LABEL[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="fm-suggestion">
              Suggested fix <span className="hint">— optional</span>
            </label>
            <textarea
              id="fm-suggestion"
              className="textarea"
              value={form.suggestion}
              onChange={(e) => set("suggestion", e.target.value)}
              placeholder="If you had a magic wand…"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Anonymous · visible in aggregate</span>
            <button className="btn coral" type="submit">
              Submit report
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100, alignSelf: "flex-start" }}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 10 }}>Preview</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CategoryPill category={form.category} />
              <SeverityPill severity={form.severity} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, marginBottom: 12, minHeight: 44 }}>
              {form.blocker || form.intent || "Your report title will appear here."}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              <Pill>{form.team}</Pill>
              <Pill>{form.process}</Pill>
              <Pill>{formatFrequency(form.frequency)}</Pill>
            </div>
            <div style={{ display: "flex", gap: 14, borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly hours</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--coral)" }}>{monthlyHours}h</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Est. monthly cost</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>${Math.round(monthlyCost).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
