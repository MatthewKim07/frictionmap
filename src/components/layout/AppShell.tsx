import type { ReactNode } from "react";

import { BusinessImpactReportModal } from "@/components/impact/BusinessImpactReportModal";
import { PersistHydrationNotifier } from "@/components/layout/PersistHydrationNotifier";
import { useFrictionStore } from "@/store/frictionStore";

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "submit" as const, label: "Report Friction" },
  { id: "insights" as const, label: "Insights" },
  { id: "roadmap" as const, label: "Fix Roadmap" },
  { id: "integrations" as const, label: "Integrations" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const page = useFrictionStore((s) => s.page);
  const setPage = useFrictionStore((s) => s.setPage);
  const toast = useFrictionStore((s) => s.toast);
  const resetDemoData = useFrictionStore((s) => s.resetDemoData);
  const dataConnectionMode = useFrictionStore((s) => s.dataConnectionMode);

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

  return (
    <div className="shell" data-screen-label={`FrictionMap · ${current.label}`}>
      <header className="header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand">
              <span className="brand-mark" aria-hidden />
              <span>FrictionMap</span>
            </div>
            <p className="brand-tagline">Find the hidden drag slowing your team down.</p>
          </div>

          <div className="header-nav-wrap">
            <div className="tabs-scroll">
              <nav className="tabs" aria-label="Primary">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tab${page === t.id ? " active" : ""}`}
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
