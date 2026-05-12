import { useEffect, useMemo, useState } from "react";

import { FRICTION_CATEGORY_DESCRIPTIONS } from "@/constants/categoryDescriptions";
import { APP_CURRENCIES, type AppCurrencyCode } from "@/constants/currency";
import {
  DEFAULT_COMPANY_NAME,
  SIMULATION_ROLE_LABELS,
  SIMULATION_ROLES,
  getEffectiveTeamOptions,
  type SimulationRole,
} from "@/constants/companySettings";
import { FRICTION_CATEGORIES, MAX_HOURLY_RATE, MIN_HOURLY_RATE, TEAMS } from "@/constants/friction";
import { DEMO_SCENARIO_IDS, DEMO_SCENARIO_LABELS, type DemoScenarioId } from "@/data/demoScenarioTypes";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useFrictionStore } from "@/store/frictionStore";

export function SettingsPage() {
  const companySettings = useFrictionStore((s) => s.companySettings);
  const setCompanySettings = useFrictionStore((s) => s.setCompanySettings);
  const setSimulationRole = useFrictionStore((s) => s.setSimulationRole);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const setHourlyRate = useFrictionStore((s) => s.setHourlyRate);
  const demoScenarioId = useFrictionStore((s) => s.demoScenarioId);
  const loadDemoScenario = useFrictionStore((s) => s.loadDemoScenario);
  const resetDemoData = useFrictionStore((s) => s.resetDemoData);
  const dataConnectionMode = useFrictionStore((s) => s.dataConnectionMode);
  const clearAllLocalData = useFrictionStore((s) => s.clearAllLocalData);

  const [companyDraft, setCompanyDraft] = useState(companySettings.companyName);
  const [rateDraft, setRateDraft] = useState(String(hourlyRate));
  const [newTeamDraft, setNewTeamDraft] = useState("");

  useEffect(() => {
    setCompanyDraft(companySettings.companyName);
  }, [companySettings.companyName]);

  useEffect(() => {
    setRateDraft(String(hourlyRate));
  }, [hourlyRate]);

  const teamOptions = useMemo(() => getEffectiveTeamOptions(companySettings), [companySettings]);

  const supabaseOn = isSupabaseConfigured();
  const dataModeLabel =
    dataConnectionMode === "supabase-connected"
      ? "Supabase connected — reports sync to your project when configured."
      : dataConnectionMode === "offline-fallback"
        ? "Offline fallback — using local demo data."
        : "Local demo mode — data stays in this browser unless you connect Supabase.";

  const commitCompanyName = () => {
    setCompanySettings({ companyName: companyDraft });
  };

  const commitRate = () => {
    const n = Number(rateDraft.replace(/,/g, "").trim());
    setHourlyRate(Number.isFinite(n) ? n : hourlyRate);
  };

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

  const addCustomTeam = () => {
    const t = newTeamDraft.trim().replace(/\s+/g, " ");
    if (!t || t.length > 64) return;
    const lower = t.toLowerCase();
    if (companySettings.customTeams.some((c) => c.toLowerCase() === lower)) {
      setNewTeamDraft("");
      return;
    }
    if ((TEAMS as readonly string[]).includes(t)) {
      setNewTeamDraft("");
      return;
    }
    setCompanySettings({ customTeams: [...companySettings.customTeams, t] });
    setNewTeamDraft("");
  };

  const removeCustomTeam = (name: string) => {
    const customTeams = companySettings.customTeams.filter((c) => c !== name);
    const nextOpts = getEffectiveTeamOptions({ ...companySettings, customTeams });
    const defaultTeam = nextOpts.includes(companySettings.defaultTeam) ? companySettings.defaultTeam : nextOpts[0] ?? "Operations";
    setCompanySettings({ customTeams, defaultTeam });
  };

  const toggleBuiltinHidden = (team: string) => {
    const hidden = new Set(companySettings.hiddenBuiltinTeams);
    if (hidden.has(team)) hidden.delete(team);
    else hidden.add(team);
    const hiddenBuiltinTeams = [...hidden];
    const nextOpts = getEffectiveTeamOptions({ ...companySettings, hiddenBuiltinTeams });
    const defaultTeam = nextOpts.includes(companySettings.defaultTeam) ? companySettings.defaultTeam : nextOpts[0] ?? "Operations";
    setCompanySettings({ hiddenBuiltinTeams, defaultTeam });
  };

  return (
    <div className="fade-in">
      <h1>Settings</h1>
      <p className="subtitle">
        Configure FrictionMap for your organization. Everything here is stored in this browser unless you use Supabase
        for reports.
      </p>

      <div
        style={{
          display: "grid",
          gap: 20,
          marginTop: 24,
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
        }}
      >
        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Company</h2>
          <div className="field">
            <label htmlFor="settings-company">Company name</label>
            <input
              id="settings-company"
              className="input"
              value={companyDraft}
              onChange={(e) => setCompanyDraft(e.target.value)}
              onBlur={commitCompanyName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCompanyName();
              }}
              placeholder={DEFAULT_COMPANY_NAME}
              autoComplete="organization"
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Shown in the header and in rollout copy. FrictionMap stays the product name.
            </p>
          </div>
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Economics</h2>
          <div className="field">
            <label htmlFor="settings-currency">Currency</label>
            <select
              id="settings-currency"
              className="select"
              value={companySettings.currencyCode}
              onChange={(e) => setCompanySettings({ currencyCode: e.target.value as AppCurrencyCode })}
            >
              {APP_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="hint" style={{ marginTop: 6 }}>
              Display only — estimates use your blended hourly rate in this currency.
            </p>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="settings-hourly">Average hourly cost (fully loaded)</label>
            <input
              id="settings-hourly"
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
            />
            <p className="hint" style={{ marginTop: 6 }}>
              Range {MIN_HOURLY_RATE}–{MAX_HOURLY_RATE} · drives monthly cost estimates across the app.
            </p>
          </div>
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Demo &amp; data</h2>
          <div className="field">
            <label htmlFor="settings-scenario">Demo scenario</label>
            <select
              id="settings-scenario"
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
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="settings-default-team">Default team (for new reports)</label>
            <select
              id="settings-default-team"
              className="select"
              value={companySettings.defaultTeam}
              onChange={(e) => setCompanySettings({ defaultTeam: e.target.value })}
            >
              {teamOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn secondary" onClick={() => resetDemoData()}>
              Reset demo data
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear all locally stored FrictionMap data and reset to the default Operations demo? This cannot be undone.",
                  )
                ) {
                  clearAllLocalData();
                }
              }}
            >
              Clear all local data
            </button>
          </div>
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Data connection</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{dataModeLabel}</p>
          <p className="hint" style={{ marginTop: 10 }}>
            Supabase env: {supabaseOn ? "configured (anon client available)." : "not configured — demo mode only."}
          </p>
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Teams</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>
            Hide built-in demo teams you do not need, and add labels that match your org. The report form uses this
            list.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
            {(TEAMS as readonly string[]).map((t) => (
              <li
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 14,
                }}
              >
                <span>{t}</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!companySettings.hiddenBuiltinTeams.includes(t)}
                    onChange={() => toggleBuiltinHidden(t)}
                  />
                  Show in forms
                </label>
              </li>
            ))}
          </ul>
          <div className="field">
            <label htmlFor="settings-new-team">Add custom team</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                id="settings-new-team"
                className="input"
                value={newTeamDraft}
                onChange={(e) => setNewTeamDraft(e.target.value)}
                placeholder="e.g. Legal"
                style={{ flex: "1 1 180px" }}
              />
              <button type="button" className="btn secondary" onClick={addCustomTeam}>
                Add
              </button>
            </div>
          </div>
          {companySettings.customTeams.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
              {companySettings.customTeams.map((t) => (
                <li
                  key={t}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    fontSize: 14,
                  }}
                >
                  <span>{t}</span>
                  <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => removeCustomTeam(t)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Friction categories (reference)</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            {FRICTION_CATEGORIES.map((c) => (
              <li key={c} style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--ink)" }}>{c}</strong>
                <div style={{ marginTop: 2 }}>{FRICTION_CATEGORY_DESCRIPTIONS[c]}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" style={{ padding: "20px 22px" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>Role simulation</h2>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>
            No login — this only adjusts emphasis in the shell to match how you are demoing the product.
          </p>
          <div className="field">
            <label htmlFor="settings-role">View as</label>
            <select
              id="settings-role"
              className="select"
              value={companySettings.simulationRole}
              onChange={(e) => setSimulationRole(e.target.value as SimulationRole)}
            >
              {SIMULATION_ROLES.map((r) => (
                <option key={r} value={r}>
                  {SIMULATION_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card" style={{ padding: "20px 22px", gridColumn: "1 / -1" }}>
          <h2 style={{ fontSize: 17, marginBottom: 10 }}>How to roll this out</h2>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.65 }}>
            <li>Ask employees to report friction for one week — keep the form short and visible.</li>
            <li>Review top bottlenecks every Friday with team leads (Insights + Fix Roadmap).</li>
            <li>Assign owners to the top three fixes with a success metric and a time box.</li>
            <li>Re-measure after changes ship; close the loop so reporters see impact.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
