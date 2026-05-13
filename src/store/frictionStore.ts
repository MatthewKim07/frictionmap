import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_COMPANY_NAME,
  defaultCompanySettings,
  getEffectiveTeamOptions,
  mergeCompanySettings,
  sanitizeOrganizationCreatedAt,
  sanitizeSimulationRole,
  SIMULATION_ROLE_LABELS,
  type CompanySettingsSlice,
  type SimulationRole,
} from "@/constants/companySettings";
import {
  FREQUENCIES,
  FRICTION_CATEGORIES,
  REPORT_STATUSES,
  SEVERITIES,
} from "@/constants/friction";
import {
  defaultIntegrationSettings,
  sanitizeIntegrationSettings,
  type IntegrationSettings,
} from "@/constants/integrationSettings";
import { MY_REPORT_IDS_KEY, STORAGE_KEY_PRIMARY, PERSIST_STORE_VERSION } from "@/constants/persist";

function readMyReportIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(MY_REPORT_IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch { return new Set(); }
}

function saveMyReportId(id: string): void {
  try {
    const ids = readMyReportIds();
    ids.add(id);
    window.localStorage.setItem(MY_REPORT_IDS_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}
import { cloneScenarioReports } from "@/data/demoScenarios";
import {
  DEMO_SCENARIO_LABELS,
  sanitizeHourlyRate,
  sanitizeScenarioId,
  type DemoScenarioId,
} from "@/data/demoScenarioTypes";
import { getDefaultReportsSnapshot } from "@/data/frictionReports";
import { type FrictionFilters, buildDashboardMetrics, filterReports } from "@/lib/frictionCalculations";
import {
  createReport as repoCreateReport,
  deleteReport as repoDeleteReport,
  getReports as repoGetReports,
  replaceReports as repoReplaceReports,
  updateReport as repoUpdateReport,
} from "@/lib/reportRepository";
import { getEffectiveOrgRole, type AuthRoleSlice } from "@/lib/effectiveOrgRole";
import {
  canChangeIntegrationMocks,
  canClearAllLocalAppData,
  canEditBlendedHourlyRate,
  canImportFrictionReports,
  canLoadAlternateDemoScenario,
  canOpenBusinessImpactReport,
  canResetDemoReports,
  canTriageRoadmapClusters,
  defaultPageForRole,
  roleMayAccessPage,
} from "@/lib/roleAccess";
import { generateRoadmapItems } from "@/lib/roadmap";
import { getDefaultOrganizationCreatedAtFromReports, shouldResetStaleOrganizationStart } from "@/lib/resolutionContributionCalendar";
import { enrichFrictionReportFromStorage, mergeReportWithTimestampFields, applyStatusTransition } from "@/lib/reportStatusTimestamps";
import type { DataConnectionMode } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import type { AppPage } from "@/types/appPage";
import type { FrictionReport } from "@/types";

export type { AppPage } from "@/types/appPage";

export type ToastState = { msg: string } | null;

export interface NewFrictionPayload {
  title: string;
  description: string;
  category: FrictionReport["category"];
  team: FrictionReport["team"];
  process: string;
  timeLostHours: number;
  frequency: FrictionReport["frequency"];
  frequencyLabel?: string;
  severity: FrictionReport["severity"];
  suggestion: string;
  attachmentUrl?: string;
}

function clampPageToRole(page: AppPage, role: SimulationRole): AppPage {
  return roleMayAccessPage(role, page) ? page : defaultPageForRole(role);
}

const LEGACY_STORAGE_KEY = "frictionmap-reports-v2";

const defaultFilters: FrictionFilters = {
  selectedTeam: null,
  selectedCategory: null,
  selectedStatus: null,
  selectedSeverity: null,
};

const CAT_SET = new Set<string>(FRICTION_CATEGORIES);
const FREQ_SET = new Set<string>(FREQUENCIES);
const SEV_SET = new Set<string>(SEVERITIES);
const STAT_SET = new Set<string>(REPORT_STATUSES);

/** Strict validation for newly submitted reports — unchanged semantics. */
function isFrictionReportShape(r: unknown): r is FrictionReport {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.description === "string" &&
    typeof o.process === "string" &&
    typeof o.timeLostHours === "number" &&
    typeof o.suggestion === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.severity === "string" &&
    SEV_SET.has(o.severity) &&
    typeof o.frequency === "string" &&
    FREQ_SET.has(o.frequency) &&
    typeof o.category === "string" &&
    CAT_SET.has(o.category) &&
    typeof o.team === "string" &&
    o.team.trim().length > 0 &&
    o.team.length <= 120 &&
    typeof o.status === "string" &&
    STAT_SET.has(o.status)
  );
}

const MAX_REPORT_HOURS = 120;

function coerceOptionalString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

/** Best-effort repair for persisted payloads (missing labels, stray types). Returns null when unusable. */
function coerceFrictionReport(raw: unknown, fallbackIndex: number): FrictionReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  let id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) id = `recovered-${fallbackIndex}-${Date.now().toString(36)}`;

  const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
  const description = typeof o.description === "string" ? o.description : "";
  const process = typeof o.process === "string" ? o.process.trim() : "";
  let suggestion = typeof o.suggestion === "string" ? o.suggestion : "";
  let createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  try {
    if (Number.isNaN(new Date(createdAt).getTime())) createdAt = new Date().toISOString();
  } catch {
    createdAt = new Date().toISOString();
  }

  let severity = typeof o.severity === "string" ? o.severity : "medium";
  if (!SEV_SET.has(severity)) severity = "medium";

  let frequency = typeof o.frequency === "string" ? o.frequency : "weekly";
  if (!FREQ_SET.has(frequency)) frequency = "weekly";

  let category = typeof o.category === "string" ? o.category : "Manual data entry";
  if (!CAT_SET.has(category)) category = "Manual data entry";

  let team = typeof o.team === "string" ? o.team.trim() : "Operations";
  if (!team) team = "Operations";
  if (team.length > 120) team = team.slice(0, 120);

  let status = typeof o.status === "string" ? o.status : "open";
  if (!STAT_SET.has(status)) status = "open";

  let timeLostHours = typeof o.timeLostHours === "number" ? o.timeLostHours : Number(o.timeLostHours);
  if (!Number.isFinite(timeLostHours)) timeLostHours = 1;
  timeLostHours = Math.min(MAX_REPORT_HOURS, Math.max(0.1, timeLostHours));

  if (!titleRaw || !process) return null;

  let resolvedAt: string | undefined;
  const ra = o.resolvedAt;
  if (typeof ra === "string" && !Number.isNaN(new Date(ra).getTime())) resolvedAt = ra;

  let updatedAt: string | undefined;
  const ua = o.updatedAt;
  if (typeof ua === "string" && !Number.isNaN(new Date(ua).getTime())) updatedAt = ua;

  const report: FrictionReport = {
    id,
    title: titleRaw,
    description: description.trim() ? description.trim() : "Description was unavailable in recovered data.",
    category: category as FrictionReport["category"],
    team: team as FrictionReport["team"],
    process,
    timeLostHours,
    frequency: frequency as FrictionReport["frequency"],
    severity: severity as FrictionReport["severity"],
    suggestion: suggestion.trim() ? suggestion.trim() : "Review with team leads and tighten this entry.",
    status: status as FrictionReport["status"],
    createdAt,
    whenLabel: coerceOptionalString(o, "whenLabel"),
    whoLabel: coerceOptionalString(o, "whoLabel"),
  };
  if (resolvedAt) report.resolvedAt = resolvedAt;
  if (updatedAt) report.updatedAt = updatedAt;
  return report;
}

interface SanitizedReportsOutcome {
  reports: FrictionReport[];
  degraded: boolean;
}

function sanitizeReportsArray(raw: unknown): SanitizedReportsOutcome {
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return { reports: [], degraded: false };
    }

    const strictOk = raw.filter(isFrictionReportShape);
    if (strictOk.length === raw.length) {
      return { reports: strictOk.map((r) => enrichFrictionReportFromStorage({ ...r })), degraded: false };
    }

    const coerced: FrictionReport[] = [];
    for (let i = 0; i < raw.length; i++) {
      const r = coerceFrictionReport(raw[i], i);
      if (r) coerced.push(r);
    }

    if (coerced.length === 0 && raw.length > 0) {
      return { reports: getDefaultReportsSnapshot(), degraded: true };
    }

    if (coerced.length > 0) {
      return {
        reports: coerced.map((r) => enrichFrictionReportFromStorage({ ...r })),
        degraded: coerced.length !== raw.length,
      };
    }

    return { reports: [], degraded: false };
  }

  return { reports: getDefaultReportsSnapshot(), degraded: true };
}

function newReportId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // fallback: rfc4122 v4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface FrictionStoreState {
  reports: FrictionReport[];
  filters: FrictionFilters;
  page: AppPage;
  toast: ToastState;
  impactReportModalOpen: boolean;
  isLoadingReports: boolean;
  reportError: string | null;
  dataConnectionMode: DataConnectionMode;

  hourlyRate: number;
  demoScenarioId: DemoScenarioId;
  /** One-shot notice after hydrate when storage was repaired — UI may toast once. */
  persistRecoverNotice: string | null;

  /** Mock integration toggles (Slack copy, ticket body, etc.) — persisted locally. */
  integrationSettings: IntegrationSettings;

  /** Short-lived toast notifications (scenario load, resets, hydrate warnings). */
  pulseToast: (msg: string) => void;
  flushPersistRecoverIfAny: () => void;

  setPage: (page: AppPage) => void;
  setImpactReportModalOpen: (open: boolean) => void;
  setFilters: (partial: Partial<FrictionFilters>) => void;
  clearFilters: () => void;
  /** Update blended hourly economics (usd) — clamps 1–500. */
  setHourlyRate: (value: number) => void;
  /** Swap demo datasets with confirmation assumed by caller. */
  loadDemoScenario: (id: DemoScenarioId) => void;
  clearPersistRecoverNotice: () => void;
  initializeReports: () => Promise<void>;

  addReport: (payload: NewFrictionPayload) => FrictionReport;
  updateReport: (id: string, updates: Partial<FrictionReport>) => void;
  setClusterReportsStatus: (
    category: FrictionReport["category"],
    process: string,
    status: FrictionReport["status"],
  ) => void;
  deleteReport: (id: string) => void;
  resetDemoData: () => void;

  /** Company / org preferences (local persistence only). */
  companySettings: CompanySettingsSlice;

  setCompanySettings: (partial: Partial<CompanySettingsSlice>) => void;
  setSimulationRole: (role: SimulationRole) => void;
  /** Wipes browser persistence and resets app state to demo defaults (does not delete Supabase rows). */
  clearAllLocalData: () => void;

  setIntegrationSettings: (partial: Partial<IntegrationSettings>) => void;
  /** Bulk-add reports (e.g. CSV import). Syncs replace to repository. */
  importReports: (incoming: FrictionReport[]) => void;

  /** Re-clamp visible page when session / directory role changes (call from auth UI). */
  syncPageForAuthChange: () => void;
}

function authRoleSlice(): AuthRoleSlice {
  const a = useAuthStore.getState();
  return {
    sessionUserId: a.sessionUserId,
    directoryUsers: a.directoryUsers,
    remoteProfile: a.remoteProfile,
  };
}

function effectiveSimulationRoleForFriction(get: () => FrictionStoreState): SimulationRole {
  return getEffectiveOrgRole(authRoleSlice(), get().companySettings.simulationRole);
}

export const useFrictionStore = create<FrictionStoreState>()(
  persist(
    (set, get) => ({
      reports: cloneScenarioReports("operations"),
      filters: { ...defaultFilters },
      page: "overview",
      toast: null,
      impactReportModalOpen: false,
      isLoadingReports: false,
      reportError: null,
      dataConnectionMode: "local-demo",
      hourlyRate: sanitizeHourlyRate(undefined),
      demoScenarioId: "operations",
      persistRecoverNotice: null,
      integrationSettings: defaultIntegrationSettings(),
      companySettings: defaultCompanySettings(),

      setCompanySettings: (partial) =>
        set((s) => {
          const merged = { ...s.companySettings, ...partial };
          const next = mergeCompanySettings(merged);
          const opts = getEffectiveTeamOptions(next);
          const defaultTeam = opts.includes(next.defaultTeam) ? next.defaultTeam : opts[0]!;
          const accessRole = getEffectiveOrgRole(authRoleSlice(), next.simulationRole);
          return {
            companySettings: { ...next, defaultTeam },
            page: clampPageToRole(s.page, accessRole),
          };
        }),

      setSimulationRole: (role) =>
        set((s) => {
          const simulationRole = sanitizeSimulationRole(role);
          const nextSettings = mergeCompanySettings({ ...s.companySettings, simulationRole });
          const accessRole = getEffectiveOrgRole(authRoleSlice(), nextSettings.simulationRole);
          return {
            companySettings: nextSettings,
            page: clampPageToRole(s.page, accessRole),
          };
        }),

      syncPageForAuthChange: () =>
        set((s) => ({
          page: clampPageToRole(s.page, effectiveSimulationRoleForFriction(() => s)),
        })),

      clearAllLocalData: () => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canClearAllLocalAppData(role)) {
          get().pulseToast(
            `Clearing all local data is restricted to administrators. Current role: ${SIMULATION_ROLE_LABELS[role]}.`,
          );
          return;
        }
        useAuthStore.getState().signOut();
        try {
          window.localStorage.removeItem(STORAGE_KEY_PRIMARY);
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        try {
          useFrictionStore.persist.clearStorage();
        } catch {
          /* older persist API */
        }
        const wasSupabase = get().dataConnectionMode === "supabase-connected";
        const fresh = cloneScenarioReports("operations");
        set({
          reports: fresh,
          filters: { ...defaultFilters },
          page: "overview",
          toast: null,
          impactReportModalOpen: false,
          isLoadingReports: false,
          reportError: null,
          dataConnectionMode: wasSupabase ? "supabase-connected" : "local-demo",
          hourlyRate: sanitizeHourlyRate(undefined),
          demoScenarioId: "operations",
          persistRecoverNotice: null,
          integrationSettings: defaultIntegrationSettings(),
          companySettings: defaultCompanySettings(),
        });
        if (!wasSupabase) {
          void repoReplaceReports(fresh).then((res) => {
            set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
            if (res.warning) get().pulseToast(res.warning);
          });
        }
        get().pulseToast(
          wasSupabase
            ? "Local browser data cleared and reset to the default Operations demo in this tab only. Supabase rows were not modified — refresh to reload from your project."
            : "Local app data cleared and reset to the default Operations demo baseline.",
        );
      },

      pulseToast: (msg) => {
        set({ toast: { msg } });
        window.setTimeout(() => {
          set((state) => (state.toast?.msg === msg ? { toast: null } : {}));
        }, 4400);
      },

      flushPersistRecoverIfAny: () => {
        const n = get().persistRecoverNotice;
        if (!n) return;
        set({ persistRecoverNotice: null });
        get().pulseToast(n);
      },

      setPage: (page) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!roleMayAccessPage(role, page)) {
          get().pulseToast(
            `That area is not enabled for the ${SIMULATION_ROLE_LABELS[role]} role. An administrator can change organization access in Settings.`,
          );
          set({ page: clampPageToRole(get().page, role) });
          return;
        }
        set({ page });
      },

      setImpactReportModalOpen: (open) => {
        if (open && !canOpenBusinessImpactReport(effectiveSimulationRoleForFriction(get))) {
          get().pulseToast("The Business Impact Report is not available for the Employee role.");
          return;
        }
        set({ impactReportModalOpen: open });
      },

      setFilters: (partial) =>
        set((s) => ({
          filters: { ...s.filters, ...partial },
        })),

      clearFilters: () => set({ filters: { ...defaultFilters } }),

      clearPersistRecoverNotice: () => set({ persistRecoverNotice: null }),

      setHourlyRate: (value) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canEditBlendedHourlyRate(role)) {
          get().pulseToast("Only managers and above can change the blended hourly rate.");
          return;
        }
        set({ hourlyRate: sanitizeHourlyRate(value) });
      },

      initializeReports: async () => {
        set({ isLoadingReports: true, reportError: null });
        try {
          const res = await repoGetReports();
          // When Supabase is connected and returns 0 rows, respect that (empty DB).
          // Only fall back to seed data when in local/demo mode.
          let next: FrictionReport[];
          if (res.mode === "supabase-connected") {
            next = sanitizeReportsArray(res.data).reports;
          } else if (res.data.length > 0) {
            next = sanitizeReportsArray(res.data).reports;
          } else {
            const localFallback = get().reports;
            next = localFallback.length > 0 ? localFallback : getDefaultReportsSnapshot();
          }
          // Restore whoLabel for reports submitted on this device.
          const myIds = readMyReportIds();
          if (myIds.size > 0) {
            next = next.map((r) => (myIds.has(r.id) ? { ...r, whoLabel: "You" } : r));
          }
          set({
            reports: next,
            dataConnectionMode: res.mode,
            reportError: res.warning ?? null,
          });
          if (res.warning) get().pulseToast(res.warning);
        } catch {
          set({
            dataConnectionMode: "offline-fallback",
            reportError: "Could not load remote data. Using local demo reports.",
          });
          get().pulseToast("Could not load remote data. Using local demo reports.");
        } finally {
          set({ isLoadingReports: false });
        }
      },

      loadDemoScenario: (id) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canLoadAlternateDemoScenario(role)) {
          get().pulseToast("Loading a different demo scenario is restricted to Operations, Administrator, or Judge Demo.");
          return;
        }
        const safe = sanitizeScenarioId(id);
        const nextReports = cloneScenarioReports(safe);
        set({
          demoScenarioId: safe,
          reports: nextReports,
          filters: { ...defaultFilters },
        });
        void repoReplaceReports(nextReports).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
        get().pulseToast(`Loaded demo scenario: ${DEMO_SCENARIO_LABELS[safe]}.`);
      },

      addReport: (payload) => {
        const id = newReportId();
        const t = new Date().toISOString();
        const report: FrictionReport = {
          ...payload,
          id,
          status: "open",
          createdAt: t,
          updatedAt: t,
          whenLabel: "just now",
          whoLabel: "You",
        };

        saveMyReportId(id);
        set((state) => ({
          reports: [report, ...state.reports],
        }));
        void repoCreateReport(report).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
        return report;
      },

      updateReport: (id, updates) => {
        const prev = get().reports.find((r) => r.id === id);
        if (!prev) return;
        const merged = mergeReportWithTimestampFields(prev, updates);
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? merged : r)),
        }));
        void repoUpdateReport(id, {
          ...updates,
          status: merged.status,
          updatedAt: merged.updatedAt,
          resolvedAt: merged.status === "resolved" ? merged.resolvedAt : null,
        } as Partial<FrictionReport> & { resolvedAt?: string | null }).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
      },

      setClusterReportsStatus: (category, process, status) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canTriageRoadmapClusters(role)) {
          get().pulseToast("Updating roadmap cluster status requires a Manager role or higher.");
          return;
        }
        set((s) => ({
          reports: s.reports.map((r) =>
            r.category === category && r.process === process ? applyStatusTransition(r, status) : r,
          ),
        }));
        const current = get().reports;
        void repoReplaceReports(current).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
      },

      deleteReport: (id) => {
        set((s) => ({
          reports: s.reports.filter((r) => r.id !== id),
        }));
        void repoDeleteReport(id).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
      },

      resetDemoData: () => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canResetDemoReports(role)) {
          get().pulseToast("Resetting demo data is not available for the Employee role.");
          return;
        }
        const id = get().demoScenarioId;
        set({
          reports: cloneScenarioReports(id),
          filters: { ...defaultFilters },
        });
        const current = get().reports;
        void repoReplaceReports(current).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
        get().pulseToast("Reports reset to the current demo scenario baseline.");
      },

      setIntegrationSettings: (partial) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canChangeIntegrationMocks(role)) {
          get().pulseToast("Integration settings can only be changed from the Integrations page (Operations role or higher).");
          return;
        }
        set((s) => ({
          integrationSettings: { ...s.integrationSettings, ...partial },
        }));
      },

      importReports: (incoming) => {
        const role = effectiveSimulationRoleForFriction(get);
        if (!canImportFrictionReports(role)) {
          get().pulseToast("Importing reports requires an Operations, Administrator, or Judge Demo role.");
          return;
        }
        if (!incoming.length) return;
        set((s) => ({
          reports: [...incoming, ...s.reports],
        }));
        const current = get().reports;
        void repoReplaceReports(current).then((res) => {
          set({ dataConnectionMode: res.mode, reportError: res.warning ?? null });
          if (res.warning) get().pulseToast(res.warning);
        });
        get().pulseToast(`Imported ${incoming.length} friction report${incoming.length === 1 ? "" : "s"}.`);
      },
    }),
    {
      name: STORAGE_KEY_PRIMARY,
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            let raw = window.localStorage.getItem(name);
            if (raw === null && name === STORAGE_KEY_PRIMARY) {
              const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
              if (legacy !== null) {
                raw = legacy;
              }
            }
            return raw;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            window.localStorage.setItem(name, value);
          } catch {
            /* quota / privacy mode */
          }
        },
        removeItem: (name) => {
          try {
            window.localStorage.removeItem(name);
          } catch {
            /* ignore */
          }
        },
      })),
      version: PERSIST_STORE_VERSION,
      partialize: (state) => ({
        reports: state.reports,
        hourlyRate: state.hourlyRate,
        demoScenarioId: state.demoScenarioId,
        integrationSettings: state.integrationSettings,
        companySettings: state.companySettings,
      }),
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) {
          return { ...current };
        }
        if (typeof persisted !== "object" || Array.isArray(persisted)) {
          return {
            ...current,
            reports: getDefaultReportsSnapshot(),
            hourlyRate: sanitizeHourlyRate(undefined),
            demoScenarioId: "operations",
            integrationSettings: defaultIntegrationSettings(),
            companySettings: defaultCompanySettings(),
            persistRecoverNotice: "Saved settings were unreadable — restored the default Operations demo.",
          };
        }

        const saved = persisted as Record<string, unknown>;
        let recoverNotice: string | null = null;
        const { reports, degraded } = sanitizeReportsArray(saved.reports);

        if (degraded) {
          recoverNotice =
            "Some friction reports in storage were repaired or replaced — review the dataset or load a fresh demo scenario.";
        }

        const hourlyRate = sanitizeHourlyRate(saved.hourlyRate);
        const demoScenarioId = sanitizeScenarioId(saved.demoScenarioId);
        const integrationSettings = sanitizeIntegrationSettings(saved.integrationSettings);
        let companySettings = mergeCompanySettings(saved.companySettings);
        const autoOrgStart = getDefaultOrganizationCreatedAtFromReports(reports);
        if (!companySettings.organizationCreatedAt) {
          companySettings = { ...companySettings, organizationCreatedAt: autoOrgStart };
        } else if (shouldResetStaleOrganizationStart(companySettings.organizationCreatedAt, reports)) {
          companySettings = { ...companySettings, organizationCreatedAt: autoOrgStart };
        }
        const accessRole = getEffectiveOrgRole(authRoleSlice(), companySettings.simulationRole);

        return {
          ...current,
          reports,
          hourlyRate,
          demoScenarioId,
          integrationSettings,
          companySettings,
          page: clampPageToRole(current.page, accessRole),
          persistRecoverNotice: recoverNotice,
        };
      },
      migrate: (oldState: unknown, fromVersion: number) => {
        const p = typeof oldState === "object" && oldState !== null ? (oldState as Record<string, unknown>) : {};
        const { reports: migratedReports } = sanitizeReportsArray(p.reports);
        let companySettings =
          fromVersion >= 5 ? mergeCompanySettings(p.companySettings) : defaultCompanySettings();
        if (fromVersion < 6) {
          companySettings = { ...companySettings, simulationRole: "admin" };
        }
        if (fromVersion < 8) {
          const fallback = getDefaultOrganizationCreatedAtFromReports(migratedReports);
          const existing = sanitizeOrganizationCreatedAt(
            (companySettings as CompanySettingsSlice).organizationCreatedAt,
          );
          companySettings = {
            ...companySettings,
            organizationCreatedAt: existing ?? fallback,
          };
        }
        return {
          reports: migratedReports,
          hourlyRate: sanitizeHourlyRate(p.hourlyRate),
          demoScenarioId: sanitizeScenarioId(p.demoScenarioId),
          integrationSettings:
            fromVersion >= 3 ? sanitizeIntegrationSettings(p.integrationSettings) : defaultIntegrationSettings(),
          companySettings,
        };
      },
    },
  ),
);

export function selectFilteredReports(state: FrictionStoreState): FrictionReport[] {
  return filterReports(state.reports, state.filters);
}

export function selectDashboardMetrics(state: FrictionStoreState) {
  return buildDashboardMetrics(selectFilteredReports(state), state.hourlyRate);
}

export function selectRoadmapItems(state: FrictionStoreState) {
  const { companyName, currencyCode } = state.companySettings;
  const recommendationSettings =
    companyName.trim() && companyName !== DEFAULT_COMPANY_NAME ? { organizationLabel: companyName.trim() } : undefined;
  return generateRoadmapItems(state.reports, state.hourlyRate, currencyCode, recommendationSettings);
}

/** Effective hourly rate for dollar math (store override). */
export function selectHourlyRate(state: FrictionStoreState): number {
  return state.hourlyRate;
}
