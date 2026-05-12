import type { ReactNode } from "react";

import { BusinessImpactReportModal } from "@/components/impact/BusinessImpactReportModal";
import { PersistHydrationNotifier } from "@/components/layout/PersistHydrationNotifier";
import { DEFAULT_COMPANY_NAME, SIMULATION_ROLE_LABELS } from "@/constants/companySettings";
import { useFrictionStore } from "@/store/frictionStore";

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "submit" as const, label: "Report Friction" },
  { id: "insights" as const, label: "Insights" },
  { id: "roadmap" as const, label: "Fix Roadmap" },
  { id: "integrations" as const, label: "Integrations" },
  { id: "settings" as const, label: "Settings" },
];

function emphasizedTabIds(role: string): readonly string[] {
  if (role === "employee") return ["submit"];
  if (role === "manager") return ["insights", "roadmap"];
  if (role === "operations") return [];
  if (role === "judge") return ["overview"];
  return [];
}

export function AppShell({ children }: { children: ReactNode }) {
  const page = useFrictionStore((s) => s.page);
  const setPage = useFrictionStore((s) => s.setPage);
  const toast = useFrictionStore((s) => s.toast);
  const resetDemoData = useFrictionStore((s) => s.resetDemoData);
  const dataConnectionMode = useFrictionStore((s) => s.dataConnectionMode);
  const companyName = useFrictionStore((s) => s.companySettings.companyName);
  const simulationRole = useFrictionStore((s) => s.companySettings.simulationRole);
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);

  const current = TABS.find((t) => t.id === page) ?? TABS[0];
  const modeLabel =
    dataConnectionMode === "supabase-connected"
      ? "Supabase connected"
      : dataConnectionMode === "offline-fallback"
        ? "Offline fallback"
        : "Local demo mode";

  const confirmReset = () => {
    if (
      window.confirm(
        "Reset all friction reports to the currently selected demo scenario baseline? Your current reports will be replaced.",
      )
    ) {
      resetDemoData();
    }
  };

  const orgLabel = companyName.trim() && companyName.trim() !== DEFAULT_COMPANY_NAME ? companyName.trim() : null;
  const emphasis = emphasizedTabIds(simulationRole);

  const roleStrip =
    simulationRole === "employee"
      ? "Employee view: prioritize capturing friction — Report Friction is highlighted."
      : simulationRole === "manager"
        ? "Manager view: prioritize triage — Insights and Fix Roadmap are highlighted."
        : simulationRole === "operations"
          ? "Operations view: align on dollars and owners — use the Business Impact Report (available from Overview, Insights, or Roadmap)."
          : simulationRole === "judge"
            ? "Judge demo: start on Overview for the executive story, then explore the flow in any order."
            : null;

  return (
    <div className="shell" data-screen-label={`FrictionMap · ${current.label}`} data-sim-role={simulationRole}>
      <header className="header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand">
              <span className="brand-mark" aria-hidden />
              <span>FrictionMap</span>
            </div>
            {orgLabel ? <p className="brand-org">{orgLabel}</p> : null}
            <p className="brand-tagline" style={{ marginTop: orgLabel ? 4 : undefined }}>
              Find the hidden drag slowing your team down.
            </p>
          </div>

          <div className="header-nav-wrap">
            <div className="tabs-scroll">
              <nav className="tabs" aria-label="Primary">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-tab={t.id}
                    className={`tab${page === t.id ? " active" : ""}${emphasis.includes(t.id) ? " tab--role-emphasis" : ""}`}
                    aria-current={page === t.id ? "page" : undefined}
                    onClick={() => setPage(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="header-end">
            <span className="role-pill" title="Simulation role (Settings)">
              {SIMULATION_ROLE_LABELS[simulationRole]}
            </span>
            <span
              className="data-mode-pill"
              title="Persistence mode"
              aria-label={`Data mode: ${modeLabel}`}
            >
              {modeLabel}
            </span>
            <button type="button" className="btn-reset-demo" onClick={confirmReset} aria-label="Reset reports to scenario baseline">
              Reset demo
            </button>
          </div>
        </div>
      </header>

      {roleStrip && (
        <div className="role-strip" role="note">
          <span>{roleStrip}</span>
          {simulationRole === "operations" && (
            <button type="button" className="btn secondary role-strip-cta" onClick={() => setImpactReportModalOpen(true)}>
              Open Business Impact Report
            </button>
          )}
        </div>
      )}

      <main className="main">{children}</main>

      {toast && (
        <div className="toast" role="status">
          <span className="dot" aria-hidden />
          {toast.msg}
        </div>
      )}

      <PersistHydrationNotifier />

      <BusinessImpactReportModal />
    </div>
  );
}
