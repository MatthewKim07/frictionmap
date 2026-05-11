import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";

import { CategoryPill, SeverityPill, StatusPill } from "@/components/ui/pills";
import { Pill } from "@/components/ui/Pill";
import {
  FREQUENCIES,
  FRICTION_CATEGORIES,
  PROCESS_OPTIONS,
  SEVERITIES,
  TEAMS,
} from "@/constants/friction";
import {
  buildImpactNarrative,
  calculateFrictionScore,
  calculateMonthlyCost,
  calculateMonthlyHours,
  getRecentReports,
} from "@/lib/frictionCalculations";
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

type FormField =
  | "title"
  | "description"
  | "category"
  | "team"
  | "process"
  | "timeLostHours"
  | "frequency"
  | "severity";

const VALIDATION_ORDER: FormField[] = [
  "title",
  "description",
  "category",
  "team",
  "process",
  "timeLostHours",
  "frequency",
  "severity",
];

const TIME_PRESETS = [0.5, 1, 2, 4] as const;

function parsePositiveHours(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function SubmitPage() {
  const addReport = useFrictionStore((s) => s.addReport);
  const setPage = useFrictionStore((s) => s.setPage);
  const reports = useFrictionStore((s) => s.reports);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const teamRef = useRef<HTMLSelectElement>(null);
  const processRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const frequencyGroupRef = useRef<HTMLDivElement>(null);
  const severityGroupRef = useRef<HTMLDivElement>(null);

  const refForField = useCallback(
    (field: FormField): HTMLElement | null => {
      switch (field) {
        case "title":
          return titleRef.current;
        case "description":
          return descriptionRef.current;
        case "category":
          return categoryRef.current;
        case "team":
          return teamRef.current;
        case "process":
          return processRef.current;
        case "timeLostHours":
          return timeRef.current;
        case "frequency":
          return frequencyGroupRef.current;
        case "severity":
          return severityGroupRef.current;
        default:
          return null;
      }
    },
    [],
  );

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: FRICTION_CATEGORIES[0] as FrictionCategory,
    team: TEAMS[0] as Team,
    process: "",
    timeLostHours: "",
    frequency: "weekly" as Frequency,
    severity: "medium" as Severity,
    suggestion: "",
  });

  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [submitted, setSubmitted] = useState<FrictionReport | null>(null);
  const [submitImpact, setSubmitImpact] = useState<{
    monthlyHours: number;
    monthlyCost: number;
    narrative: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    const errKey = k as FormField;
    if (errors[errKey]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[errKey];
        return next;
      });
    }
  }

  const recentThree = useMemo(() => getRecentReports(reports, 3), [reports]);

  const previewReport: FrictionReport | null = useMemo(() => {
    const hours = parsePositiveHours(form.timeLostHours);
    if (hours === null) return null;
    return {
      id: "preview",
      title: form.title.trim() || "—",
      description: form.description.trim() || "—",
      category: form.category,
      team: form.team,
      process: form.process.trim() || "—",
      timeLostHours: hours,
      frequency: form.frequency,
      severity: form.severity,
      suggestion: form.suggestion.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    };
  }, [form]);

  const validate = useCallback((): Partial<Record<FormField, string>> => {
    const next: Partial<Record<FormField, string>> = {};
    if (!form.title.trim()) next.title = "Add a short title so others can spot this quickly.";
    if (!form.description.trim()) next.description = "A sentence or two helps teams understand what happened.";
    if (!form.category) next.category = "Choose the type of friction.";
    if (!form.team) next.team = "Which team felt this?";
    if (!form.process.trim()) next.process = "Name the tool, system, or workflow involved.";
    const hours = parsePositiveHours(form.timeLostHours);
    if (hours === null) next.timeLostHours = "Enter how many hours you lost this time — use a number greater than zero.";
    if (!form.frequency) next.frequency = "How often does this happen?";
    if (!form.severity) next.severity = "How disruptive was it?";
    return next;
  }, [form]);

  function focusFirstError(nextErrors: Partial<Record<FormField, string>>) {
    for (const field of VALIDATION_ORDER) {
      if (nextErrors[field]) {
        const el = refForField(field);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el && "focus" in el && typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus();
        }
        break;
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    const hours = parsePositiveHours(form.timeLostHours)!;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      team: form.team,
      process: form.process.trim(),
      timeLostHours: hours,
      frequency: form.frequency,
      severity: form.severity,
      suggestion: form.suggestion.trim(),
    };

    setIsSubmitting(true);
    window.requestAnimationFrame(() => {
      try {
        const report = addReport(payload);
        const monthlyHours = calculateMonthlyHours(report);
        const monthlyCost = Math.round(calculateMonthlyCost(report, hourlyRate));
        setSubmitImpact({
          monthlyHours: Math.round(monthlyHours * 10) / 10,
          monthlyCost,
          narrative: buildImpactNarrative(report),
        });
        setSubmitted(report);
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  function resetForAnother() {
    setSubmitted(null);
    setSubmitImpact(null);
    setErrors({});
    setForm({
      title: "",
      description: "",
      category: FRICTION_CATEGORIES[0] as FrictionCategory,
      team: TEAMS[0] as Team,
      process: "",
      timeLostHours: "",
      frequency: "weekly",
      severity: "medium",
      suggestion: "",
    });
  }

  if (submitted && submitImpact) {
    return (
      <motion.div
        className="fade-in"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <h1>Friction report added</h1>
        <p className="subtitle">Thanks — this helps leadership see where work gets stuck.</p>

        <div className="card" style={{ marginTop: 24, maxWidth: 720 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 6 }}>Report</div>
              <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{submitted.title}</div>
            </div>
            <CategoryPill category={submitted.category} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <Pill>{submitted.team}</Pill>
            <Pill>{submitted.process}</Pill>
            <Pill>{formatFrequency(submitted.frequency)}</Pill>
            <SeverityPill severity={submitted.severity} />
            <span style={{ fontSize: 12, color: "var(--ink-mute)", alignSelf: "center" }}>
              ID · {submitted.id}
            </span>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 10,
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 8 }}>Estimated impact</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Monthly hours</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {submitImpact.monthlyHours}h
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Monthly cost</div>
                <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ${submitImpact.monthlyCost.toLocaleString()}
                </div>
              </div>
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              {submitImpact.narrative}
            </p>
          </div>

          <p style={{ marginTop: 18, fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            This will now be included in <strong>Insights</strong> and the <strong>Fix Roadmap</strong>.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            <button type="button" className="btn secondary" onClick={resetForAnother}>
              Report another
            </button>
            <button type="button" className="btn" onClick={() => setPage("insights")}>
              View insights
            </button>
            <button type="button" className="btn" onClick={() => setPage("roadmap")}>
              View roadmap
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const previewMetrics =
    previewReport !== null
      ? {
          monthlyHours: Math.round(calculateMonthlyHours(previewReport) * 10) / 10,
          monthlyCost: Math.round(calculateMonthlyCost(previewReport, hourlyRate)),
          score: Math.round(calculateFrictionScore(previewReport)),
          narrative: buildImpactNarrative(previewReport),
        }
      : null;

  return (
    <div className="fade-in">
      <h1>Report Friction</h1>
      <p className="subtitle">
        Two minutes now saves your team hours later. Your name stays off this report — we aggregate by team and
        category.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 1fr)", gap: 24, marginTop: 28 }}
      >
        <div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="field">
              <label htmlFor="fm-title">What got slowed down?</label>
              <input
                ref={titleRef}
                id="fm-title"
                className={`input${errors.title ? " input-invalid" : ""}`}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Example: Waiting for database access"
                autoComplete="off"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "fm-title-err" : undefined}
              />
              {errors.title && (
                <div id="fm-title-err" className="field-error" role="alert">
                  {errors.title}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="fm-description">What happened?</label>
              <textarea
                ref={descriptionRef}
                id="fm-description"
                className={`textarea${errors.description ? " input-invalid" : ""}`}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Briefly describe what slowed you down."
                rows={3}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "fm-desc-err" : undefined}
              />
              {errors.description && (
                <div id="fm-desc-err" className="field-error" role="alert">
                  {errors.description}
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="fm-category">What type of friction was it?</label>
                <select
                  ref={categoryRef}
                  id="fm-category"
                  className={`select${errors.category ? " input-invalid" : ""}`}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as FrictionCategory)}
                  aria-invalid={!!errors.category}
                >
                  {FRICTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <div className="field-error" role="alert">
                    {errors.category}
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="fm-team">Which team was affected?</label>
                <select
                  ref={teamRef}
                  id="fm-team"
                  className={`select${errors.team ? " input-invalid" : ""}`}
                  value={form.team}
                  onChange={(e) => set("team", e.target.value as Team)}
                  aria-invalid={!!errors.team}
                >
                  {TEAMS.map((t) => (
                    <option key={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.team && (
                  <div className="field-error" role="alert">
                    {errors.team}
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <label htmlFor="fm-process">Tool, system, or process involved</label>
              <input
                ref={processRef}
                id="fm-process"
                className={`input${errors.process ? " input-invalid" : ""}`}
                value={form.process}
                onChange={(e) => set("process", e.target.value)}
                placeholder="Example: Analytics DB, CRM, invoice spreadsheet"
                list="process-suggestions"
                autoComplete="off"
                aria-invalid={!!errors.process}
                aria-describedby={errors.process ? "fm-process-err" : undefined}
              />
              <datalist id="process-suggestions">
                {PROCESS_OPTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {errors.process && (
                <div id="fm-process-err" className="field-error" role="alert">
                  {errors.process}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="fm-hours">Approx. time lost (hours)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {TIME_PRESETS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="btn secondary"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    onClick={() => set("timeLostHours", String(h))}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <input
                ref={timeRef}
                id="fm-hours"
                type="number"
                inputMode="decimal"
                min={0.25}
                step={0.25}
                className={`input${errors.timeLostHours ? " input-invalid" : ""}`}
                value={form.timeLostHours}
                onChange={(e) => set("timeLostHours", e.target.value)}
                placeholder="e.g. 1.5"
                aria-invalid={!!errors.timeLostHours}
                aria-describedby={errors.timeLostHours ? "fm-hours-err" : undefined}
              />
              {errors.timeLostHours && (
                <div id="fm-hours-err" className="field-error" role="alert">
                  {errors.timeLostHours}
                </div>
              )}
            </div>

            <div className="field">
              <span id="fm-frequency-label">How often does this happen?</span>
              <div
                ref={frequencyGroupRef}
                tabIndex={-1}
                className="segmented"
                role="radiogroup"
                aria-labelledby="fm-frequency-label"
                aria-invalid={!!errors.frequency}
              >
                {FREQUENCIES.map((f) => (
                  <button
                    type="button"
                    key={f}
                    role="radio"
                    aria-checked={form.frequency === f}
                    className={form.frequency === f ? "active" : ""}
                    onClick={() => set("frequency", f)}
                  >
                    {formatFrequency(f)}
                  </button>
                ))}
              </div>
              {errors.frequency && (
                <div className="field-error" role="alert">
                  {errors.frequency}
                </div>
              )}
            </div>

            <div className="field">
              <span id="fm-severity-label">How disruptive was it?</span>
              <div
                ref={severityGroupRef}
                tabIndex={-1}
                className="sev-group"
                role="radiogroup"
                aria-labelledby="fm-severity-label"
              >
                {SEVERITIES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    role="radio"
                    aria-checked={form.severity === s}
                    className={`sev-chip${form.severity === s ? " active" : ""}`}
                    onClick={() => set("severity", s)}
                  >
                    <span className="sev-label">{s}</span>
                    <span>{SEVERITY_LABEL[s]}</span>
                  </button>
                ))}
              </div>
              {errors.severity && (
                <div className="field-error" role="alert">
                  {errors.severity}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="fm-suggestion">
                Any idea to fix it? <span className="hint">Optional</span>
              </label>
              <textarea
                id="fm-suggestion"
                className="textarea"
                value={form.suggestion}
                onChange={(e) => set("suggestion", e.target.value)}
                placeholder="Optional: What would make this easier next time?"
                rows={2}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingTop: 8,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                Submissions roll into company-wide metrics — not your manager’s inbox.
              </span>
              <button className="btn coral" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>

          {recentThree.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="section-head" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 16 }}>Recent reports</h2>
                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Latest in FrictionMap</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentThree.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      alignItems: "start",
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--rule)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{r.team}</span>
                        <CategoryPill category={r.category} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        ${Math.round(calculateMonthlyCost(r, hourlyRate)).toLocaleString()}/mo
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <StatusPill status={r.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <motion.aside
          style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100, alignSelf: "flex-start" }}
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 10, fontWeight: 500 }}>
              Live impact preview
            </div>
            {previewMetrics ? (
              <motion.div
                key={`${previewMetrics.monthlyHours}-${previewMetrics.score}`}
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <CategoryPill category={form.category} />
                  <SeverityPill severity={form.severity} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, marginBottom: 14, minHeight: 44 }}>
                  {form.title.trim() || "Your title will show here."}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  <Pill>{form.team}</Pill>
                  {form.process.trim() && <Pill>{form.process.trim()}</Pill>}
                  <Pill>{formatFrequency(form.frequency)}</Pill>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>Est. monthly hours</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--coral)", fontVariantNumeric: "tabular-nums" }}>
                      {previewMetrics.monthlyHours}h
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>Est. monthly cost</div>
                    <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      ${previewMetrics.monthlyCost.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 4 }}>Friction score</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{previewMetrics.score}</div>
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                    borderTop: "1px solid var(--rule)",
                    paddingTop: 14,
                  }}
                >
                  {previewMetrics.narrative}
                </p>
              </motion.div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-mute)", lineHeight: 1.5 }}>
                Enter a positive number for time lost to see monthly hours, cost, and a plain-English impact estimate.
              </p>
            )}
          </div>
        </motion.aside>
      </form>
    </div>
  );
}
