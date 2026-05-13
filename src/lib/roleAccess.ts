import type { SimulationRole } from "@/constants/companySettings";
import type { AppPage } from "@/types/appPage";

const ROLE_PAGES: Record<SimulationRole, readonly AppPage[]> = {
  employee: ["overview", "submit"],
  manager: ["overview", "submit", "insights", "roadmap"],
  operations: ["overview", "submit", "insights", "roadmap", "integrations"],
  admin: ["overview", "submit", "insights", "roadmap", "integrations", "settings"],
  judge: ["overview", "submit", "insights", "roadmap", "integrations", "settings"],
};

export function pagesAllowedForRole(role: SimulationRole): readonly AppPage[] {
  return ROLE_PAGES[role] ?? ROLE_PAGES.employee;
}

export function roleMayAccessPage(role: SimulationRole, page: AppPage): boolean {
  return pagesAllowedForRole(role).includes(page);
}

export function defaultPageForRole(role: SimulationRole): AppPage {
  const pages = pagesAllowedForRole(role);
  return pages.includes("overview") ? "overview" : pages[0] ?? "submit";
}

/** Settings tab and org-wide configuration UI (this browser — not authenticated multi-user). */
export function canAccessSettingsTab(role: SimulationRole): boolean {
  return role === "admin" || role === "judge";
}

export function canOpenBusinessImpactReport(role: SimulationRole): boolean {
  return role !== "employee";
}

export function canResetDemoReports(role: SimulationRole): boolean {
  return role !== "employee";
}

export function canLoadAlternateDemoScenario(role: SimulationRole): boolean {
  return role === "operations" || role === "admin" || role === "judge";
}

export function canTriageRoadmapClusters(role: SimulationRole): boolean {
  return role === "manager" || role === "operations" || role === "admin" || role === "judge";
}

export function canEditBlendedHourlyRate(role: SimulationRole): boolean {
  return role !== "employee";
}

export function canImportFrictionReports(role: SimulationRole): boolean {
  return role === "operations" || role === "admin" || role === "judge";
}

export function canChangeIntegrationMocks(role: SimulationRole): boolean {
  return role === "operations" || role === "admin" || role === "judge";
}

export function canClearAllLocalAppData(role: SimulationRole): boolean {
  return role === "admin" || role === "judge";
}

export function canShowOverviewDemoToolbar(role: SimulationRole): boolean {
  return role !== "employee";
}
