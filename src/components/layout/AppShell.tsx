import type { ReactNode } from "react";

import { SupabaseAuthSync } from "@/components/auth/SupabaseAuthSync";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { BusinessImpactReportModal } from "@/components/impact/BusinessImpactReportModal";
import { PersistHydrationNotifier } from "@/components/layout/PersistHydrationNotifier";
import { DEFAULT_COMPANY_NAME, SIMULATION_ROLE_LABELS } from "@/constants/companySettings";
import { useEffectiveOrgRole, useSessionUser } from "@/hooks/useEffectiveOrgRole";
import { canOpenBusinessImpactReport, canResetDemoReports, pagesAllowedForRole } from "@/lib/roleAccess";
import { SENIORITY_LABELS } from "@/types/orgDirectory";
import { useAuthStore } from "@/store/authStore";
import { useFrictionStore } from "@/store/frictionStore";
import type { AppPage } from "@/types/appPage";

const TABS: { id: AppPage; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "submit", label: "Report Friction" },
  { id: "insights", label: "Insights" },
  { id: "roadmap", label: "Fix Roadmap" },
  { id: "integrations", label: "Integrations" },
  { id: "settings", label: "Settings" },
];

function emphasizedTabIds(role: string): readonly AppPage[] {
  if (role === "employee") return ["submit"];
  if (role === "manager") return ["insights", "roadmap"];
  if (role === "operations") return ["integrations"];
  if (role === "admin") return ["settings"];
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
  const setImpactReportModalOpen = useFrictionStore((s) => s.setImpactReportModalOpen);
  const pulseToast = useFrictionStore((s) => s.pulseToast);
  const syncPageForAuthChange = useFrictionStore((s) => s.syncPageForAuthChange);

  const effectiveRole = useEffectiveOrgRole();
  const sessionUser = useSessionUser();
  const setLoginPanelOpen = useAuthStore((s) => s.setLoginPanelOpen);
  const signOut = useAuthStore((s) => s.signOut);

  const allowedTabs = pagesAllowedForRole(effectiveRole);
  const visibleTabs = TABS.filter((t) => allowedTabs.includes(t.id));
  const current = visibleTabs.find((t) => t.id === page) ?? visibleTabs[0] ?? TABS[0];
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
  const emphasis = emphasizedTabIds(effectiveRole);

  const roleStrip =
    effectiveRole === "employee"
      ? "Employee: submit friction quickly — other areas stay hidden until an administrator assigns a higher organization role (Team directory or device role in Settings)."
      : effectiveRole === "manager"
        ? "Manager: triage patterns and the fix roadmap — organization-wide settings stay with an administrator."
        : effectiveRole === "operations"
          ? "Operations: align on dollars and owners — Integrations and the Business Impact Report are in scope."
          : effectiveRole === "admin"
            ? "Administrator: manage people and roles under Settings → Team directory, or use device role when no one is signed in."
            : effectiveRole === "judge"
              ? "Judge demo: full access — start on Overview for the executive story, then explore in any order."
              : null;

  return (
    <div className="shell" data-screen-label={`FrictionMap · ${current.label}`} data-sim-role={effectiveRole}>
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
                {visibleTabs.map((t) => (
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
            {sessionUser ? (
              <span
                className="role-pill"
                title={`Signed in · ${SIMULATION_ROLE_LABELS[effectiveRole]}`}
                style={{ maxWidth: 280, textAlign: "right" }}
              >
                <span style={{ display: "block", fontWeight: 600 }}>{sessionUser.displayName}</span>
                <span style={{ display: "block", fontSize: 11, opacity: 0.9, fontWeight: 400 }}>
                  {SENIORITY_LABELS[sessionUser.seniority]} · {SIMULATION_ROLE_LABELS[effectiveRole]}
                </span>
              </span>
            ) : (
              <span className="role-pill" title="Device role when no one is signed in — change in Settings">
                {SIMULATION_ROLE_LABELS[effectiveRole]}
              </span>
            )}
            <span
              className="data-mode-pill"
              title="Persistence mode"
              aria-label={`Data mode: ${modeLabel}`}
            >
              {modeLabel}
            </span>
            {sessionUser ? (
              <button
                type="button"
                className="btn secondary"
                style={{ padding: "6px 12px", fontSize: 13 }}
                onClick={() => {
                  signOut();
                  syncPageForAuthChange();
                  pulseToast("Signed out.");
                }}
              >
                Sign out
              </button>
            ) : (
              <button type="button" className="btn secondary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setLoginPanelOpen(true)}>
                Sign in
              </button>
            )}
            {canResetDemoReports(effectiveRole) ? (
              <button type="button" className="btn-reset-demo" onClick={confirmReset} aria-label="Reset reports to scenario baseline">
                Reset demo
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {roleStrip && (
        <div className="role-strip" role="note">
          <span>{roleStrip}</span>
          {canOpenBusinessImpactReport(effectiveRole) && (
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

      <SupabaseAuthSync />
      <LoginPanel />
    </div>
  );
}
