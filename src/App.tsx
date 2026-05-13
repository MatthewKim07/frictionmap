import { AppShell } from "@/components/layout/AppShell";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PersistHydrationNotifier } from "@/components/layout/PersistHydrationNotifier";
import { SupabaseAuthSync } from "@/components/auth/SupabaseAuthSync";
import { InsightsPage } from "@/pages/InsightsPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { LandingPage } from "@/pages/LandingPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SubmitPage } from "@/pages/SubmitPage";
import { useSessionUser } from "@/hooks/useEffectiveOrgRole";
import { useFrictionStore } from "@/store/frictionStore";

export default function App() {
  const page = useFrictionStore((s) => s.page);
  const toast = useFrictionStore((s) => s.toast);
  const sessionUser = useSessionUser();

  if (!sessionUser) {
    return (
      <>
        <LandingPage />
        {toast && (
          <div className="toast" role="status">
            <span className="dot" aria-hidden />
            {toast.msg}
          </div>
        )}
        <PersistHydrationNotifier />
        <SupabaseAuthSync />
        <LoginPanel />
      </>
    );
  }

  return (
    <AppShell>
      {page === "overview" && <OverviewPage />}
      {page === "submit" && <SubmitPage />}
      {page === "insights" && <InsightsPage />}
      {page === "roadmap" && <RoadmapPage />}
      {page === "integrations" && <IntegrationsPage />}
      {page === "settings" && <SettingsPage />}
    </AppShell>
  );
}
