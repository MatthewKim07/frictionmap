import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { IntegrationSettings, MockTicketPriority } from "@/constants/integrationSettings";
import { exportFrictionReportsToCsv, exportRoadmapSummaryCsv, frictionReportsCsvTemplate, parseFrictionReportsCsv } from "@/lib/csvFriction";
import { buildSlackSummaryMessage, buildTrackerTicketMarkdown, buildTrackerTicketPlainForApi } from "@/lib/integrationMocks";
import { liveCreateJiraIssue, liveCreateLinearIssue, livePostSlackSummary } from "@/lib/integrationsLive";
import { generateRoadmapItems } from "@/lib/roadmap";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useFrictionStore } from "@/store/frictionStore";
import type { DerivedRoadmapItem } from "@/types";

type CardStatus = "demo" | "mock" | "soon" | "hybrid" | "local";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
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

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
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

function newImportId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `csv-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `csv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function statusPill(status: CardStatus): { label: string; className: string } {
  if (status === "soon") return { label: "Coming soon", className: "pill ink" };
  if (status === "mock") return { label: "Connected (mock)", className: "pill lime" };
  if (status === "hybrid") return { label: "Copy or live", className: "pill amber" };
  if (status === "local") return { label: "Copy only", className: "pill ink" };
  return { label: "Demo", className: "pill amber" };
}

function IntegrationCard({
  title,
  subtitle,
  status,
  footNote,
  children,
}: {
  title: string;
  subtitle: string;
  status: CardStatus;
  /** Replaces default privacy / live hint under the title row. */
  footNote?: string;
  children: ReactNode;
}) {
  const pill = statusPill(status);
  const defaultFoot =
    "Copy and CSV stay in your browser. Live Slack/Jira/Linear calls go through Supabase Edge Functions — credentials are stored as Function secrets, not in the SPA.";
  return (
    <section className="card" style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
        <div>
          <h2 style={{ fontSize: 17, margin: "0 0 4px", fontWeight: 600 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45 }}>{subtitle}</p>
        </div>
        <span className={pill.className} style={{ fontSize: 11, flexShrink: 0 }}>
          <span className="dot" aria-hidden />
          {pill.label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.45 }}>{footNote ?? defaultFoot}</p>
      <div style={{ marginTop: "auto", paddingTop: 8 }}>{children}</div>
    </section>
  );
}

export function IntegrationsPage() {
  const reports = useFrictionStore((s) => s.reports);
  const hourlyRate = useFrictionStore((s) => s.hourlyRate);
  const integrationSettings = useFrictionStore((s) => s.integrationSettings);
  const setIntegrationSettings = useFrictionStore((s) => s.setIntegrationSettings);
  const importReports = useFrictionStore((s) => s.importReports);
  const pulseToast = useFrictionStore((s) => s.pulseToast);

  const roadmap = useMemo(() => generateRoadmapItems(reports, hourlyRate), [reports, hourlyRate]);

  const [slackPreview, setSlackPreview] = useState("");
  const [ticketItemId, setTicketItemId] = useState<string>(() => roadmap[0]?.id ?? "");
  const [ticketPreview, setTicketPreview] = useState<{ jira: string; linear: string } | null>(null);
  const [csvPaste, setCsvPaste] = useState("");
  const [csvOutcome, setCsvOutcome] = useState<ReturnType<typeof parseFrictionReportsCsv> | null>(null);
  const [liveBusy, setLiveBusy] = useState<"idle" | "slack" | "jira" | "linear">("idle");

  const supabaseReady = isSupabaseConfigured();
  const trackerCardStatus: CardStatus = supabaseReady ? "hybrid" : "local";

  useEffect(() => {
    setTicketPreview(null);
  }, [ticketItemId]);

  useEffect(() => {
    if (!roadmap.length) return;
    if (!roadmap.some((r) => r.id === ticketItemId)) {
      setTicketItemId(roadmap[0]!.id);
    }
  }, [roadmap, ticketItemId]);

  const selectedRoadmap = useMemo(
    () => roadmap.find((r) => r.id === ticketItemId) ?? roadmap[0] ?? null,
    [roadmap, ticketItemId],
  );

  const refreshTicketPreview = useCallback(
    (item: DerivedRoadmapItem | null) => {
      if (!item) {
        setTicketPreview(null);
        return;
      }
      const jira = buildTrackerTicketMarkdown(item, hourlyRate, integrationSettings, "jira");
      const linear = buildTrackerTicketMarkdown(item, hourlyRate, integrationSettings, "linear");
      setTicketPreview({
        jira: `# ${jira.title}\n\n**Priority (mock):** ${jira.priority}\n\n${jira.body}`,
        linear: `# ${linear.title}\n\n**Priority (mock):** ${linear.priority}\n\n${linear.body}`,
      });
    },
    [hourlyRate, integrationSettings],
  );

  const onSlackGenerate = () => {
    const msg = buildSlackSummaryMessage(reports, hourlyRate, integrationSettings);
    setSlackPreview(msg);
    pulseToast("Slack summary generated — copy when ready.");
  };

  const onSlackCopy = async () => {
    const text = slackPreview || buildSlackSummaryMessage(reports, hourlyRate, integrationSettings);
    const ok = await copyToClipboard(text);
    pulseToast(ok ? "Copied to clipboard." : "Copy failed — select the text and copy manually.");
  };

  const onSlackSendLive = async () => {
    const text = slackPreview || buildSlackSummaryMessage(reports, hourlyRate, integrationSettings);
    setLiveBusy("slack");
    const res = await livePostSlackSummary(text);
    setLiveBusy("idle");
    if (res.ok) pulseToast("Posted to Slack via your Incoming Webhook.");
    else pulseToast(res.error);
  };

  const onJiraCreateLive = async () => {
    if (!selectedRoadmap) {
      pulseToast("Add friction reports to create a roadmap item first.");
      return;
    }
    const pk = integrationSettings.jiraProjectKey.trim();
    if (!pk) {
      pulseToast("Set Jira project key in Integration settings.");
      return;
    }
    const { summary, description } = buildTrackerTicketPlainForApi(selectedRoadmap, hourlyRate, integrationSettings, "jira");
    setLiveBusy("jira");
    const res = await liveCreateJiraIssue({
      projectKey: pk,
      issueTypeName: integrationSettings.jiraIssueTypeName.trim() || "Task",
      summary,
      description,
    });
    setLiveBusy("idle");
    if (res.ok && res.url) pulseToast(`Jira issue created: ${res.key ?? ""} ${res.url}`.trim());
    else if (res.ok) pulseToast("Jira issue created.");
    else pulseToast(res.error);
  };

  const onLinearCreateLive = async () => {
    if (!selectedRoadmap) {
      pulseToast("Add friction reports to create a roadmap item first.");
      return;
    }
    const teamId = integrationSettings.linearTeamId.trim();
    if (!teamId) {
      pulseToast("Set Linear team ID in Integration settings.");
      return;
    }
    const { summary, description } = buildTrackerTicketPlainForApi(selectedRoadmap, hourlyRate, integrationSettings, "linear");
    setLiveBusy("linear");
    const res = await liveCreateLinearIssue({ teamId, title: summary, description });
    setLiveBusy("idle");
    if (res.ok && res.url) pulseToast(`Linear issue: ${res.identifier ?? ""} ${res.url}`.trim());
    else if (res.ok) pulseToast("Linear issue created.");
    else pulseToast(res.error);
  };

  const onTicketGenerate = () => {
    if (!selectedRoadmap) {
      pulseToast("Add friction reports to create a roadmap item first.");
      return;
    }
    refreshTicketPreview(selectedRoadmap);
    pulseToast("Ticket draft generated — copy Jira or Linear markdown.");
  };

  const onTicketCopy = async (which: "jira" | "linear") => {
    if (!ticketPreview) {
      pulseToast("Generate a ticket draft first.");
      return;
    }
    const ok = await copyToClipboard(which === "jira" ? ticketPreview.jira : ticketPreview.linear);
    pulseToast(ok ? `${which === "jira" ? "Jira" : "Linear"} markdown copied.` : "Copy failed — try selecting text manually.");
  };

  const onCsvParse = () => {
    const out = parseFrictionReportsCsv(csvPaste, newImportId);
    setCsvOutcome(out);
    if (out.valid.length) pulseToast(`Parsed ${out.valid.length} valid row(s).`);
    else if (out.rows.some((r) => r.errors.length)) pulseToast("Fix CSV errors or check the header row.");
    else pulseToast("No valid rows found.");
  };

  const onCsvImport = () => {
    if (!csvOutcome?.valid.length) {
      pulseToast("Parse the CSV and ensure at least one valid row.");
      return;
    }
    importReports(csvOutcome.valid);
    setCsvPaste("");
    setCsvOutcome(null);
  };

  const onDownloadTemplate = () => {
    downloadText("frictionmap-import-template.csv", frictionReportsCsvTemplate(), "text/csv");
    pulseToast("Template downloaded.");
  };

  const onExportReports = () => {
    downloadText("frictionmap-reports.csv", exportFrictionReportsToCsv(reports), "text/csv");
    pulseToast("Exported friction reports as CSV.");
  };

  const onExportRoadmap = () => {
    const rows = roadmap.map((r) => ({
      problemTitle: r.problemTitle,
      category: r.category,
      process: r.process,
      priorityLevel: r.priorityLevel,
      monthlyHours: r.monthlyHours,
      monthlyCost: r.monthlyCost,
      relatedCount: r.relatedReports.length,
      suggestedFix: r.suggestedFix,
      firstStep: r.firstStep,
    }));
    downloadText("frictionmap-roadmap.csv", exportRoadmapSummaryCsv(rows), "text/csv");
    pulseToast("Exported roadmap summary as CSV.");
  };

  const setBool = (key: keyof Pick<IntegrationSettings, "slackIncludeCostEstimates" | "ticketIncludeRelatedReports">, v: boolean) => {
    setIntegrationSettings({ [key]: v });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Integrations</h1>
        <p style={{ margin: 0, maxWidth: 760, color: "var(--ink-soft)", lineHeight: 1.55, fontSize: 15 }}>
          Use <span style={{ fontWeight: 700 }}>copy and CSV</span> with no backend. For{" "}
          <span style={{ fontWeight: 700 }}>real Slack, Jira, and Linear</span>, deploy the included Supabase Edge Functions
          and add vendor credentials as <span style={{ fontWeight: 700 }}>Function secrets</span> (never in{" "}
          <code style={{ fontSize: 13 }}>VITE_*</code> env). See{" "}
          <code style={{ fontSize: 13 }}>docs/integrations-edge-functions.md</code>.
        </p>
        {!supabaseReady ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ink-mute)" }}>
            Supabase env vars are not set — live buttons stay disabled; copy/export still works.
          </p>
        ) : null}
      </header>

      <section className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 14px", fontWeight: 600 }}>Integration settings</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-mute)" }}>Saved in this browser with your other FrictionMap preferences.</p>
        <div style={{ display: "grid", gap: 14, maxWidth: 520 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={integrationSettings.slackIncludeCostEstimates}
              onChange={(e) => setBool("slackIncludeCostEstimates", e.target.checked)}
            />
            Include cost estimates in Slack summary
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={integrationSettings.ticketIncludeRelatedReports}
              onChange={(e) => setBool("ticketIncludeRelatedReports", e.target.checked)}
            />
            Include related reports in Jira / Linear ticket body
          </label>
          <div>
            <label htmlFor="int-default-priority" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--ink-mute)" }}>
              Default ticket priority (mock)
            </label>
            <select
              id="int-default-priority"
              className="select-like"
              style={{ width: "100%", maxWidth: 280, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--rule-strong)" }}
              value={integrationSettings.defaultTicketPriority}
              onChange={(e) => setIntegrationSettings({ defaultTicketPriority: e.target.value as MockTicketPriority })}
            >
              {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-mute)" }}>
              Used as a fallback label in generated ticket drafts when roadmap rank is ambiguous.
            </p>
          </div>
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--ink-mute)" }}>Live Jira / Linear (Edge Functions)</div>
            <label htmlFor="int-jira-project" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-mute)" }}>
              Jira project key
            </label>
            <input
              id="int-jira-project"
              type="text"
              value={integrationSettings.jiraProjectKey}
              onChange={(e) => setIntegrationSettings({ jiraProjectKey: e.target.value.toUpperCase() })}
              placeholder="e.g. FM"
              style={{ width: "100%", maxWidth: 280, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--rule-strong)", marginBottom: 10 }}
              autoComplete="off"
            />
            <label htmlFor="int-jira-type" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-mute)" }}>
              Jira issue type name
            </label>
            <input
              id="int-jira-type"
              type="text"
              value={integrationSettings.jiraIssueTypeName}
              onChange={(e) => setIntegrationSettings({ jiraIssueTypeName: e.target.value })}
              placeholder="Task, Story, Bug…"
              style={{ width: "100%", maxWidth: 280, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--rule-strong)", marginBottom: 10 }}
              autoComplete="off"
            />
            <label htmlFor="int-linear-team" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-mute)" }}>
              Linear team ID (UUID)
            </label>
            <input
              id="int-linear-team"
              type="text"
              value={integrationSettings.linearTeamId}
              onChange={(e) => setIntegrationSettings({ linearTeamId: e.target.value })}
              placeholder="From Linear → Settings → Teams"
              style={{ width: "100%", maxWidth: 360, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--rule-strong)" }}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <IntegrationCard
          title="Slack"
          subtitle="Weekly-style summary for leadership channels — copy/paste or post via Incoming Webhook."
          status={supabaseReady ? "hybrid" : "local"}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn coral" onClick={onSlackGenerate} disabled={liveBusy !== "idle"}>
              Generate Slack summary
            </button>
            <button type="button" className="btn secondary" onClick={onSlackCopy} disabled={liveBusy !== "idle"}>
              Copy Slack message
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => void onSlackSendLive()}
              disabled={!supabaseReady || liveBusy !== "idle"}
              title={supabaseReady ? "Requires deployed post-slack-webhook + SLACK_INCOMING_WEBHOOK_URL secret" : undefined}
            >
              {liveBusy === "slack" ? "Sending…" : "Send to Slack (live)"}
            </button>
          </div>
          {slackPreview ? (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: "var(--paper-2)",
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                maxHeight: 200,
                overflow: "auto",
                border: "1px solid var(--rule)",
              }}
            >
              {slackPreview}
            </pre>
          ) : null}
        </IntegrationCard>

        <IntegrationCard
          title="Jira"
          subtitle="Markdown drafts for your backlog, or create a real issue in Jira Cloud via Edge Function."
          status={trackerCardStatus}
        >
          <RoadmapTicketControls
            roadmap={roadmap}
            ticketItemId={ticketItemId}
            setTicketItemId={setTicketItemId}
            onGenerate={onTicketGenerate}
            onCopyJira={() => onTicketCopy("jira")}
            onCreateLive={() => void onJiraCreateLive()}
            liveBusy={liveBusy}
            supabaseReady={supabaseReady}
          />
          {ticketPreview ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-mute)" }}>Draft ready — copy Jira or Linear markdown from the buttons above or the Linear card.</p>
          ) : null}
        </IntegrationCard>

        <IntegrationCard
          title="Linear"
          subtitle="Markdown drafts or create a real Linear issue (GraphQL) via Edge Function."
          status={trackerCardStatus}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ink-soft)" }}>
            Pick a roadmap item in the Jira card, generate a draft, then copy or create live here.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn secondary" onClick={() => onTicketCopy("linear")} disabled={!ticketPreview || liveBusy !== "idle"}>
              Copy Linear markdown
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => void onLinearCreateLive()}
              disabled={!supabaseReady || liveBusy !== "idle" || !selectedRoadmap}
              title={supabaseReady ? "Requires create-linear-issue + LINEAR_API_KEY secret" : undefined}
            >
              {liveBusy === "linear" ? "Creating…" : "Create in Linear (live)"}
            </button>
          </div>
        </IntegrationCard>

        <IntegrationCard
          title="CSV import"
          subtitle="Paste CSV rows exported from a spreadsheet. Header row must match the template."
          status="mock"
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <button type="button" className="btn secondary" onClick={onDownloadTemplate}>
              Download template
            </button>
            <button type="button" className="btn secondary" onClick={() => void copyToClipboard(frictionReportsCsvTemplate()).then((ok) => pulseToast(ok ? "Template copied." : "Copy failed."))}>
              Copy template
            </button>
          </div>
          <label htmlFor="csv-paste" className="visually-hidden">
            CSV paste area
          </label>
          <textarea
            id="csv-paste"
            rows={5}
            value={csvPaste}
            onChange={(e) => setCsvPaste(e.target.value)}
            placeholder="title,description,category,team,process,..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--rule-strong)",
              fontSize: 13,
              fontFamily: "ui-monospace, monospace",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn coral" onClick={onCsvParse}>
              Parse &amp; preview
            </button>
            <button type="button" className="btn secondary" onClick={onCsvImport} disabled={!csvOutcome?.valid.length}>
              Import {csvOutcome?.valid.length ?? 0} valid row(s)
            </button>
          </div>
          {csvOutcome && csvOutcome.rows.length > 0 ? (
            <div style={{ marginTop: 12, maxHeight: 180, overflow: "auto", fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--rule)" }}>
                    <th style={{ padding: "4px 6px" }}>Row</th>
                    <th style={{ padding: "4px 6px" }}>Status</th>
                    <th style={{ padding: "4px 6px" }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {csvOutcome.rows.map((row) => (
                    <tr key={row.rowIndex} style={{ borderBottom: "1px solid var(--rule)" }}>
                      <td style={{ padding: "4px 6px", fontVariantNumeric: "tabular-nums" }}>{row.rowIndex}</td>
                      <td style={{ padding: "4px 6px" }}>{row.report ? "OK" : "Skip"}</td>
                      <td style={{ padding: "4px 6px", color: row.errors.length ? "var(--coral)" : "var(--ink-soft)" }}>
                        {row.errors.length ? row.errors.join("; ") : row.report?.title ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </IntegrationCard>

        <IntegrationCard
          title="CSV export"
          subtitle="Download all friction reports or a roadmap summary for spreadsheets and exec packs."
          status="mock"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="btn coral" onClick={onExportReports} disabled={!reports.length}>
              Export friction reports (.csv)
            </button>
            <button type="button" className="btn secondary" onClick={onExportRoadmap} disabled={!roadmap.length}>
              Export roadmap summary (.csv)
            </button>
          </div>
        </IntegrationCard>

        <IntegrationCard
          title="Notion / Docs"
          subtitle="Sync a living friction register to Notion or Google Docs — planned for a future release."
          status="soon"
        >
          <button type="button" className="btn secondary" disabled>
            Connect (coming soon)
          </button>
        </IntegrationCard>
      </div>
    </div>
  );
}

function RoadmapTicketControls({
  roadmap,
  ticketItemId,
  setTicketItemId,
  onGenerate,
  onCopyJira,
  onCreateLive,
  liveBusy,
  supabaseReady,
}: {
  roadmap: DerivedRoadmapItem[];
  ticketItemId: string;
  setTicketItemId: (id: string) => void;
  onGenerate: () => void;
  onCopyJira: () => void;
  onCreateLive: () => void;
  liveBusy: "idle" | "slack" | "jira" | "linear";
  supabaseReady: boolean;
}) {
  if (!roadmap.length) {
    return <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>No roadmap clusters yet — add reports first.</p>;
  }
  return (
    <>
      <label htmlFor="int-roadmap-pick" style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6, color: "var(--ink-mute)" }}>
        Roadmap item
      </label>
      <select
        id="int-roadmap-pick"
        className="select-like"
        style={{ width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--rule-strong)" }}
        value={ticketItemId}
        onChange={(e) => setTicketItemId(e.target.value)}
      >
        {roadmap.map((item) => (
          <option key={item.id} value={item.id}>
            {item.problemTitle} — {item.process}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn coral" onClick={onGenerate} disabled={liveBusy !== "idle"}>
          Generate ticket draft
        </button>
        <button type="button" className="btn secondary" onClick={onCopyJira} disabled={liveBusy !== "idle"}>
          Copy Jira markdown
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={onCreateLive}
          disabled={!supabaseReady || liveBusy !== "idle"}
          title={supabaseReady ? "Requires create-jira-issue + Jira secrets on the function" : undefined}
        >
          {liveBusy === "jira" ? "Creating…" : "Create in Jira (live)"}
        </button>
      </div>
    </>
  );
}
