import { AppShell } from "@/components/layout/AppShell";
import { InsightsPage } from "@/pages/InsightsPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SubmitPage } from "@/pages/SubmitPage";
import { useFrictionStore } from "@/store/frictionStore";

export default function App() {
  const page = useFrictionStore((s) => s.page);

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
