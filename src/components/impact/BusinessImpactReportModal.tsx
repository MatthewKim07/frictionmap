import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { AVERAGE_HOURLY_COST } from "@/constants/friction";
import {
  generateBusinessImpactReport,
  type BusinessImpactReportTone,
} from "@/lib/reportGenerator";
import { formatCurrency, formatHours } from "@/lib/frictionCalculations";
import { useFrictionStore } from "@/store/frictionStore";

const TONE_OPTIONS: { id: BusinessImpactReportTone; label: string; hint: string }[] = [
  { id: "executive", label: "Executive", hint: "Money, risk, and leadership focus" },
  { id: "technical", label: "Technical", hint: "Systems, integrations, implementation" },
  { id: "operations", label: "Operations", hint: "Workflow, ownership, and next steps" },
];

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("aria-hidden", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function downloadMarkdown(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BusinessImpactReportModal() {
  const open = useFrictionStore((s) => s.impactReportModalOpen);
  const setOpen = useFrictionStore((s) => s.setImpactReportModalOpen);
  const reports = useFrictionStore((s) => s.reports);

  const [tone, setTone] = useState<BusinessImpactReportTone>("executive");
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [feedback, setFeedback] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setGeneratedAt(new Date());
    setFeedback(null);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setFeedback(null);
  }, [tone]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const result = useMemo(() => {
    if (!reports.length) return null;
    return generateBusinessImpactReport(reports, {
      tone,
      hourlyRate: AVERAGE_HOURLY_COST,
      generatedAt,
    });
  }, [reports, tone, generatedAt]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-root"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="modal-backdrop"
            aria-label="Close impact report"
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="impact-report-title"
            className="modal-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="modal-panel-head">
              <div>
                <h2 id="impact-report-title" style={{ fontSize: 20, marginBottom: 4 }}>
                  Business Impact Report
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink-mute)" }}>
                  Export a demo-ready summary from your live friction data.
                </p>
              </div>
              <button ref={closeBtnRef} type="button" className="btn secondary" onClick={close}>
                Close
              </button>
            </div>

            {!reports.length ? (
              <div className="modal-panel-body">
                <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  Add friction reports first to generate a business impact report.
                </p>
              </div>
            ) : (
              <>
                <div className="modal-toolbar">
                  <div className="field" style={{ minWidth: 200, flex: "1 1 200px" }}>
                    <label htmlFor="impact-report-tone">Report tone</label>
                    <select
                      id="impact-report-tone"
                      className="select"
                      value={tone}
                      onChange={(e) => setTone(e.target.value as BusinessImpactReportTone)}
                    >
                      {TONE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label} — {o.hint}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-mute)", alignSelf: "flex-end" }}>
                    Generated{" "}
                    <time dateTime={result?.generatedAtIso}>
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(generatedAt)}
                    </time>
                  </div>
                </div>

                {result && (
                  <div className="modal-stats" aria-label="Report statistics">
                    <span className="modal-stat-pill">
                      {result.stats.reportCount} reports
                    </span>
                    <span className="modal-stat-pill">{formatHours(result.stats.monthlyHoursLost)}/mo</span>
                    <span className="modal-stat-pill">{formatCurrency(result.stats.monthlyCostLeakage)}/mo</span>
                    <span className="modal-stat-pill">{result.stats.roadmapClusterCount} clusters</span>
                    <span className="modal-stat-pill">{result.stats.openCount} open</span>
                  </div>
                )}

                <div className="modal-panel-body" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  <div className="modal-preview-label" id="impact-preview-label">
                    Preview
                  </div>
                  <pre
                    className="modal-preview"
                    tabIndex={0}
                    aria-labelledby="impact-preview-label"
                  >
                    {result?.markdown ?? ""}
                  </pre>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={!result}
                    onClick={async () => {
                      if (!result) return;
                      const ok = await copyToClipboard(result.markdown);
                      setFeedback(
                        ok
                          ? "Report copied to clipboard."
                          : "Could not copy automatically. Select the preview text and copy manually (Ctrl/Cmd+C).",
                      );
                    }}
                  >
                    Copy report
                  </button>
                  <button
                    type="button"
                    className="btn coral"
                    disabled={!result}
                    onClick={() => {
                      if (!result) return;
                      downloadMarkdown("frictionmap-impact-report.md", result.markdown);
                      setFeedback('Downloaded "frictionmap-impact-report.md".');
                    }}
                  >
                    Download Markdown
                  </button>
                </div>

                <div className="modal-feedback" role="status" aria-live="polite">
                  {feedback ?? "\u00a0"}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
