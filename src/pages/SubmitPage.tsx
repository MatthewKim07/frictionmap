import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { CategoryPill, SeverityPill, StatusPill } from "@/components/ui/pills";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { FRICTION_CATEGORY_DESCRIPTIONS } from "@/constants/categoryDescriptions";
import { getEffectiveTeamOptions } from "@/constants/companySettings";
import {
  FRICTION_CATEGORIES,
  PROCESS_OPTIONS,
  SEVERITIES,
} from "@/constants/friction";
import {
  buildImpactNarrative,
  calculateFrictionScore,
  calculateMonthlyCost,
  calculateMonthlyHours,
  formatCurrency,
  formatFrequencyLabel,
  formatReportDate,
} from "@/lib/frictionCalculations";
import { canTriageRoadmapClusters } from "@/lib/roleAccess";
import { useEffectiveOrgRole } from "@/hooks/useEffectiveOrgRole";
import { useFrictionStore } from "@/store/frictionStore";
import type { FrictionCategory, FrictionReport, Frequency, Severity, Team } from "@/types";

// ─── constants ──────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const TIME_CHIPS = [0.5, 1, 2, 4, 8] as const;

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
  "category",
  "description",
  "frequency",
  "timeLostHours",
  "process",
  "team",
  "severity",
];

// ─── helpers ────────────────────────────────────────────────────────────────

function parsePositiveHours(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function relativeDate(r: FrictionReport): string {
  if (r.whenLabel) return r.whenLabel;
  return formatReportDate(r.createdAt);
}

// ─── segmented control ──────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labelFor,
  ariaLabel,
  groupRef,
  invalid,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
  ariaLabel: string;
  groupRef?: React.RefObject<HTMLDivElement>;
  invalid?: boolean;
}) {
  return (
    <div
      ref={groupRef}
      tabIndex={-1}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid}
      style={{
        display: "inline-flex",
        background: "var(--paper-2)",
        borderRadius: "var(--radius-sm)",
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--ink)" : "var(--ink-mute)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
              transition: "all 0.14s ease",
            }}
          >
            {labelFor(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ─── recurring pill row ─────────────────────────────────────────────────────

type RecurringChoice = "daily" | "weekly" | "monthly" | "custom";
const RECURRING_OPTIONS: RecurringChoice[] = ["daily", "weekly", "monthly", "custom"];

function RecurringPills({
  value,
  onChange,
}: {
  value: RecurringChoice;
  onChange: (v: RecurringChoice) => void;
}) {
  const label: Record<RecurringChoice, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: "Custom…",
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {RECURRING_OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: `1px solid ${active ? "transparent" : "var(--rule-strong)"}`,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              background: active ? "var(--coral-soft)" : "var(--surface)",
              color: active ? "#9a3a2f" : "var(--ink-soft)",
              transition: "all 0.13s ease",
            }}
          >
            {label[opt]}
          </button>
        );
      })}
    </div>
  );
}

// ─── time chip row ──────────────────────────────────────────────────────────

function TimeChips({ onSelect }: { onSelect: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {TIME_CHIPS.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onSelect(String(h))}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: "1px solid var(--rule)",
            fontSize: 12,
            cursor: "pointer",
            background: "var(--paper-2)",
            color: "var(--ink-soft)",
            transition: "border-color 0.12s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--rule-strong)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--rule)";
          }}
        >
          {h}h
        </button>
      ))}
      <span style={{ alignSelf: "center", fontSize: 12, color: "var(--ink-mute)" }}>quick fill</span>
    </div>
  );
}

// ─── report list row ────────────────────────────────────────────────────────

function ReportRow({ r, hourlyRate, currencyCode }: { r: FrictionReport; hourlyRate: number; currencyCode: string }) {
  const monthlyCost = Math.round(calculateMonthlyCost(r, hourlyRate));
  const freqDisplay = r.frequencyLabel ?? formatFrequencyLabel(r.frequency);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 16,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, lineHeight: 1.3 }}>{r.title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <CategoryPill category={r.category} />
          {r.process && (
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{r.process}</span>
          )}
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>· {freqDisplay}</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <StatusPill status={r.status} />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatCurrency(monthlyCost, currencyCode as Parameters<typeof formatCurrency>[1])}/mo
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 3 }}>
          {relativeDate(r)}
        </div>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function SubmitPage() {
  const addReport = useFrictionStore((s) => s.addReport);
  const setPage = useFrictionStore((s) => s.setPage);
  const reports = useFrictionStore((s) => s.reports);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const companySettings = useFrictionStore((s) => s.companySettings);
  const teamOptions = useMemo(() => getEffectiveTeamOptions(companySettings), [companySettings]);
  const currencyCode = companySettings.currencyCode;

  const effectiveRole = useEffectiveOrgRole();
  const canSeeAllReports = canTriageRoadmapClusters(effectiveRole);

  // ── view state ────────────────────────────────────────────────────────────
  const [view, setView] = useState<"list" | "create">("list");
  const [activeTab, setActiveTab] = useState<"mine" | "all">("mine");

  // ── form state ────────────────────────────────────────────────────────────
  const [form, setFormState] = useState({
    title: "",
    description: "",
    category: "" as FrictionCategory,
    team: "Operations" as Team,
    process: "",
    timeLostHours: "",
    severity: "medium" as Severity,
    suggestion: "",
  });

  const [frequencyMode, setFrequencyMode] = useState<"once" | "recurring">("recurring");
  const [recurringChoice, setRecurringChoice] = useState<RecurringChoice>("weekly");
  const [customFreqLabel, setCustomFreqLabel] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([""]);
  const updateAttachmentUrl = (i: number, val: string) => {
    setAttachmentUrls((prev) => {
      const next = [...prev];
      next[i] = val;
      if (i === prev.length - 1 && val) next.push("");
      return next;
    });
    if (val) setAttachedFiles([]);
  };
  const removeAttachmentUrl = (i: number) =>
    setAttachmentUrls((prev) => prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i));
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; objectUrl: string }[]>([]);

  useEffect(() => {
    return () => { attachedFiles.forEach((f) => URL.revokeObjectURL(f.objectUrl)); };
  // only revoke on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveFrequency: Frequency = frequencyMode === "once"
    ? "once"
    : recurringChoice === "custom"
      ? "weekly"
      : recurringChoice;

  const effectiveFreqLabel: string | undefined = frequencyMode === "recurring" && recurringChoice === "custom" && customFreqLabel.trim()
    ? customFreqLabel.trim()
    : undefined;

  useEffect(() => {
    setFormState((f) => {
      const nextTeam = teamOptions.includes(f.team)
        ? f.team
        : teamOptions.includes(companySettings.defaultTeam)
          ? companySettings.defaultTeam
          : teamOptions[0] ?? "Operations";
      if (nextTeam === f.team) return f;
      return { ...f, team: nextTeam as Team };
    });
  }, [teamOptions, companySettings.defaultTeam]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setFormState((f) => ({ ...f, [k]: v }));
    const errKey = k as FormField;
    if (errors[errKey]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[errKey];
        return next;
      });
    }
  }

  // ── refs for scroll-to-error ──────────────────────────────────────────────
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const teamRef = useRef<HTMLSelectElement>(null);
  const processRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const frequencyGroupRef = useRef<HTMLDivElement>(null);
  const severityGroupRef = useRef<HTMLDivElement>(null);

  const refForField = useCallback((field: FormField): HTMLElement | null => {
    switch (field) {
      case "title": return titleRef.current;
      case "description": return descriptionRef.current;
      case "category": return categoryRef.current;
      case "team": return teamRef.current;
      case "process": return processRef.current;
      case "timeLostHours": return timeRef.current;
      case "frequency": return frequencyGroupRef.current;
      case "severity": return severityGroupRef.current;
      default: return null;
    }
  }, []);

  // ── submission state ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [submitted, setSubmitted] = useState<FrictionReport | null>(null);
  const [submitImpact, setSubmitImpact] = useState<{
    monthlyHours: number;
    monthlyCost: number;
    narrative: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── live preview ──────────────────────────────────────────────────────────
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
      frequency: effectiveFrequency,
      frequencyLabel: effectiveFreqLabel,
      severity: form.severity,
      suggestion: form.suggestion.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, effectiveFrequency, effectiveFreqLabel]);

  const previewMetrics = previewReport !== null
    ? {
        monthlyHours: Math.round(calculateMonthlyHours(previewReport) * 10) / 10,
        monthlyCost: Math.round(calculateMonthlyCost(previewReport, hourlyRate)),
        score: Math.round(calculateFrictionScore(previewReport)),
        narrative: buildImpactNarrative(previewReport),
      }
    : null;

  // ── validation ────────────────────────────────────────────────────────────
  const validate = useCallback((): Partial<Record<FormField, string>> => {
    const next: Partial<Record<FormField, string>> = {};
    if (!form.title.trim()) next.title = "Add a short subject so this report is easy to identify.";
    if (!form.category) next.category = "Choose the type of friction.";
    if (!form.description.trim()) next.description = "A sentence or two helps teams understand what happened.";
    const hours = parsePositiveHours(form.timeLostHours);
    if (hours === null) next.timeLostHours = "Enter how many hours you lost — use a number greater than zero.";
    if (!form.process.trim()) next.process = "Name the tool, system, or workflow involved.";
    if (!form.team) next.team = "Which team felt this?";
    if (!form.severity) next.severity = "How disruptive was it?";
    return next;
  }, [form]);

  function focusFirstError(nextErrors: Partial<Record<FormField, string>>) {
    for (const field of VALIDATION_ORDER) {
      if (nextErrors[field]) {
        const el = refForField(field);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el && "focus" in el) (el as HTMLElement).focus();
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
      frequency: effectiveFrequency,
      frequencyLabel: effectiveFreqLabel,
      severity: form.severity,
      suggestion: form.suggestion.trim(),
      attachmentUrl: [
        ...attachedFiles.map((f) => f.objectUrl),
        ...attachmentUrls.filter((u) => u.trim()),
      ].join("\n") || undefined,
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
    setFrequencyMode("recurring");
    setRecurringChoice("weekly");
    setCustomFreqLabel("");
    setAttachmentUrls([""]);
    setAttachedFiles([]);
    setFormState({
      title: "",
      description: "",
      category: "" as FrictionCategory,
      team: (teamOptions.includes(companySettings.defaultTeam)
        ? companySettings.defaultTeam
        : teamOptions[0] ?? "Operations") as Team,
      process: "",
      timeLostHours: "",
      severity: "medium",
      suggestion: "",
    });
  }

  function goToList() {
    setView("list");
    setSubmitted(null);
    setSubmitImpact(null);
    resetForAnother();
  }

  // ── filtered report lists ─────────────────────────────────────────────────
  const myReports = useMemo(
    () => [...reports].filter((r) => r.whoLabel === "You").sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [reports],
  );
  const allReports = useMemo(
    () => [...reports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [reports],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────

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
            <Pill>{submitted.frequencyLabel ?? formatFrequencyLabel(submitted.frequency)}</Pill>
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
                  {formatCurrency(submitImpact.monthlyCost, currencyCode as Parameters<typeof formatCurrency>[1])}
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
            <button type="button" className="btn secondary" onClick={goToList}>
              ← Back to reports
            </button>
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

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (view === "list") {
    const displayedReports = activeTab === "mine" ? myReports : allReports;

    return (
      <motion.div
        className="fade-in"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>Friction Reports</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              Track submitted friction and its estimated impact on your team.
            </p>
          </div>
          <button type="button" className="btn coral" onClick={() => setView("create")}>
            ＋ Create Report
          </button>
        </div>

        {/* tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginTop: 28,
            borderBottom: "2px solid var(--rule)",
          }}
        >
          {(["mine", ...(canSeeAllReports ? ["all" as const] : [])] as const).map((tab) => {
            const label = tab === "mine" ? "My Reports" : "All Reports";
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as "mine" | "all")}
                style={{
                  padding: "8px 18px",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--ink)" : "var(--ink-mute)",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: -2,
                  transition: "color 0.14s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          {displayedReports.length === 0 ? (
            <EmptyState
              title={activeTab === "mine" ? "No reports yet" : "No reports in the org yet"}
              description={
                activeTab === "mine"
                  ? "You haven't submitted any friction reports. Create one to start tracking friction and its impact."
                  : "No friction reports have been submitted yet."
              }
            >
              {activeTab === "mine" && (
                <button type="button" className="btn coral" onClick={() => setView("create")}>
                  ＋ Create Report
                </button>
              )}
            </EmptyState>
          ) : (
            <div className="card" style={{ padding: "4px 22px" }}>
              {displayedReports.map((r) => (
                <ReportRow
                  key={r.id}
                  r={r}
                  hourlyRate={hourlyRate}
                  currencyCode={currencyCode}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="fade-in"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        onClick={() => setView("list")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          color: "var(--ink-mute)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: 18,
        }}
      >
        ← Back to reports
      </button>

      <h1>Report Friction</h1>
      <p className="subtitle">
        Two minutes now saves your team hours later. Your name stays off this report — we aggregate by team and category.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 1fr)",
          gap: 24,
          marginTop: 28,
        }}
      >
        {/* ── left: form ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* 1. Subject */}
            <div className="field">
              <label htmlFor="fm-title">Subject</label>
              <input
                ref={titleRef}
                id="fm-title"
                className={`input${errors.title ? " input-invalid" : ""}`}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Waiting for database access"
                autoComplete="off"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "fm-title-err" : undefined}
              />
              {errors.title && (
                <div id="fm-title-err" className="field-error" role="alert">{errors.title}</div>
              )}
            </div>

            {/* 2. Category */}
            <div className="field">
              <label htmlFor="fm-category">Category</label>
              <select
                ref={categoryRef}
                id="fm-category"
                className={`select${errors.category ? " input-invalid" : ""}`}
                value={form.category}
                onChange={(e) => set("category", e.target.value as FrictionCategory)}
                aria-invalid={!!errors.category}
              >
                <option value="" disabled>— Select category —</option>
                {FRICTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {form.category && <p className="hint" style={{ marginTop: 5 }}>{FRICTION_CATEGORY_DESCRIPTIONS[form.category]}</p>}
              {errors.category && (
                <div className="field-error" role="alert">{errors.category}</div>
              )}
            </div>

            {/* 3. Description */}
            <div className="field">
              <label htmlFor="fm-description">Description</label>
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
                <div id="fm-desc-err" className="field-error" role="alert">{errors.description}</div>
              )}
            </div>

            {/* 4. How often? (above time lost) */}
            <div className="field">
              <span
                id="fm-frequency-label"
                style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 10 }}
              >
                How often does this happen?
              </span>
              <div ref={frequencyGroupRef} tabIndex={-1} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* One-time / Recurring toggle */}
                <SegmentedControl
                  options={["once", "recurring"] as const}
                  value={frequencyMode}
                  onChange={(v) => setFrequencyMode(v as "once" | "recurring")}
                  labelFor={(v) => v === "once" ? "One-time" : "Recurring"}
                  ariaLabel="Frequency mode"
                />
                {/* Recurring options */}
                <AnimatePresence>
                  {frequencyMode === "recurring" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <RecurringPills value={recurringChoice} onChange={setRecurringChoice} />
                        <AnimatePresence>
                          {recurringChoice === "custom" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.14 }}
                              style={{ overflow: "hidden" }}
                            >
                              <input
                                className="input"
                                value={customFreqLabel}
                                onChange={(e) => setCustomFreqLabel(e.target.value)}
                                placeholder="e.g. every sprint, twice a month"
                                style={{ marginTop: 4 }}
                                autoFocus
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {errors.frequency && (
                <div className="field-error" role="alert">{errors.frequency}</div>
              )}
            </div>

            {/* 5. Time lost */}
            <div className="field">
              <label htmlFor="fm-hours">Time lost (hours)</label>
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
              <TimeChips onSelect={(v) => set("timeLostHours", v)} />
              {errors.timeLostHours && (
                <div id="fm-hours-err" className="field-error" role="alert">{errors.timeLostHours}</div>
              )}
            </div>

            {/* 6. Process / Tool */}
            <div className="field">
              <label htmlFor="fm-process">Tool, system, or process involved</label>
              <input
                ref={processRef}
                id="fm-process"
                className={`input${errors.process ? " input-invalid" : ""}`}
                value={form.process}
                onChange={(e) => set("process", e.target.value)}
                placeholder="e.g. Analytics DB, CRM, invoice spreadsheet"
                list="process-suggestions"
                autoComplete="off"
                aria-invalid={!!errors.process}
                aria-describedby={errors.process ? "fm-process-err" : undefined}
              />
              <datalist id="process-suggestions">
                {PROCESS_OPTIONS.map((p) => <option key={p} value={p} />)}
              </datalist>
              {errors.process && (
                <div id="fm-process-err" className="field-error" role="alert">{errors.process}</div>
              )}
            </div>

            {/* 7. Team */}
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
                {teamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.team && (
                <div className="field-error" role="alert">{errors.team}</div>
              )}
            </div>

            {/* 8. Severity */}
            <div className="field">
              <span
                id="fm-severity-label"
                style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 10 }}
              >
                How disruptive was it?
              </span>
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
                <div className="field-error" role="alert">{errors.severity}</div>
              )}
            </div>

            {/* 9. Fix suggestion — always visible, optional */}
            <div className="field">
              <label htmlFor="fm-suggestion">
                Fix suggestion <span className="hint">(Optional)</span>
              </label>
              <textarea
                id="fm-suggestion"
                className="textarea"
                value={form.suggestion}
                onChange={(e) => set("suggestion", e.target.value)}
                placeholder="What would make this easier next time?"
                rows={3}
              />
            </div>

            {/* 10. Attachment — always visible, optional */}
            <div className="field">
              <label>
                Attachments <span className="hint">(Optional)</span>
              </label>
              {attachmentUrls.map((url, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input"
                    type="url"
                    value={url}
                    onChange={(e) => updateAttachmentUrl(i, e.target.value)}
                    placeholder="https://… paste a link"
                    disabled={attachedFiles.length > 0}
                    style={{ flex: 1 }}
                  />
                  {(attachmentUrls.length > 1 || url) && (
                    <button
                      type="button"
                      onClick={() => removeAttachmentUrl(i)}
                      style={{
                        flexShrink: 0,
                        padding: "0 10px",
                        background: "none",
                        border: "1px solid var(--rule-strong)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: 14,
                        color: "var(--ink-mute)",
                      }}
                      aria-label="Remove link"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
              </div>
              {attachedFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {attachedFiles.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--rule-strong)",
                        background: "var(--paper-2)",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📎 {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(f.objectUrl);
                          setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        style={{ fontSize: 12, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
                        aria-label="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px dashed var(--rule-strong)",
                  background: "var(--paper)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                  transition: "border-color 0.14s ease, color 0.14s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-mute)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink-soft)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--rule-strong)";
                  (e.currentTarget as HTMLElement).style.color = "var(--ink-mute)";
                }}
              >
                <span>📎</span>
                <span>{attachedFiles.length > 0 ? "Add more files" : "Choose a file"}</span>
                <input
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    const newEntries = files.map((file) => ({ name: file.name, objectUrl: URL.createObjectURL(file) }));
                    setAttachedFiles((prev) => [...prev, ...newEntries]);
                    setAttachmentUrls([""]);
                  }}
                />
              </label>
              <p style={{ margin: 0, fontSize: 11, color: "var(--ink-mute)" }}>
                File attachments are session-only and not uploaded to a server.
              </p>
            </div>

            {/* submit row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--rule)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                Submissions roll into company-wide metrics — not your manager's inbox.
              </span>
              <button className="btn coral" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>

        {/* ── right: live preview ──────────────────────────────────────── */}
        <motion.aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "sticky",
            top: 100,
            alignSelf: "flex-start",
          }}
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
                  {form.title.trim() || "Your subject will show here."}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  <Pill>{form.team}</Pill>
                  {form.process.trim() && <Pill>{form.process.trim()}</Pill>}
                  <Pill>
                    {frequencyMode === "once"
                      ? "One-time"
                      : recurringChoice === "custom"
                        ? customFreqLabel.trim() || "Custom"
                        : recurringChoice.charAt(0).toUpperCase() + recurringChoice.slice(1)}
                  </Pill>
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
                      {formatCurrency(previewMetrics.monthlyCost, currencyCode as Parameters<typeof formatCurrency>[1])}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 4 }}>Friction score</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {previewMetrics.score}
                </div>
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
    </motion.div>
  );
}
