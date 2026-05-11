import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  AVERAGE_HOURLY_COST,
  FREQUENCIES,
  FRICTION_CATEGORIES,
  REPORT_STATUSES,
  SEVERITIES,
  TEAMS,
} from "@/constants/friction";
import { SEED_FRICTION_REPORTS } from "@/data/frictionReports";
import { type FrictionFilters, buildDashboardMetrics, filterReports } from "@/lib/frictionCalculations";
import { generateRoadmapItems } from "@/lib/roadmap";
import type { FrictionReport } from "@/types";

export type AppPage = "overview" | "submit" | "insights" | "roadmap";

export type ToastState = { msg: string } | null;

export interface NewFrictionPayload {
  title: string;
  description: string;
  category: FrictionReport["category"];
  team: FrictionReport["team"];
  process: string;
  timeLostHours: number;
  frequency: FrictionReport["frequency"];
  severity: FrictionReport["severity"];
  suggestion: string;
}

const STORAGE_KEY = "frictionmap-reports-v2";

const defaultFilters: FrictionFilters = {
  selectedTeam: null,
  selectedCategory: null,
  selectedStatus: null,
};

const CAT_SET = new Set<string>(FRICTION_CATEGORIES);
const TEAM_SET = new Set<string>(TEAMS);
const FREQ_SET = new Set<string>(FREQUENCIES);
const SEV_SET = new Set<string>(SEVERITIES);
const STAT_SET = new Set<string>(REPORT_STATUSES);

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
    TEAM_SET.has(o.team) &&
    typeof o.status === "string" &&
    STAT_SET.has(o.status)
  );
}

function newReportId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `f-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeReports(raw: unknown): FrictionReport[] {
  if (!Array.isArray(raw)) return [...SEED_FRICTION_REPORTS];
  if (raw.length === 0) return [];
  const ok = raw.filter(isFrictionReportShape);
  if (ok.length !== raw.length) return [...SEED_FRICTION_REPORTS];
  return ok;
}

interface FrictionStoreState {
  reports: FrictionReport[];
  filters: FrictionFilters;
  page: AppPage;
  toast: ToastState;

  setPage: (page: AppPage) => void;
  setFilters: (partial: Partial<FrictionFilters>) => void;
  clearFilters: () => void;

  addReport: (payload: NewFrictionPayload) => FrictionReport;
  updateReport: (id: string, updates: Partial<FrictionReport>) => void;
  deleteReport: (id: string) => void;
  resetDemoData: () => void;
}

export const useFrictionStore = create<FrictionStoreState>()(
  persist(
    (set) => ({
      reports: [...SEED_FRICTION_REPORTS],
      filters: { ...defaultFilters },
      page: "overview",
      toast: null,

      setPage: (page) => set({ page }),

      setFilters: (partial) =>
        set((s) => ({
          filters: { ...s.filters, ...partial },
        })),

      clearFilters: () => set({ filters: { ...defaultFilters } }),

      addReport: (payload) => {
        const id = newReportId();
        const report: FrictionReport = {
          ...payload,
          id,
          status: "open",
          createdAt: new Date().toISOString(),
          whenLabel: "just now",
          whoLabel: "You",
        };

        set((state) => ({
          reports: [report, ...state.reports],
        }));
        return report;
      },

      updateReport: (id, updates) =>
        set((s) => ({
          reports: s.reports.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteReport: (id) =>
        set((s) => ({
          reports: s.reports.filter((r) => r.id !== id),
        })),

      resetDemoData: () =>
        set({
          reports: SEED_FRICTION_REPORTS.map((r) => ({ ...r })),
          filters: { ...defaultFilters },
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ reports: state.reports }),
      version: 1,
      merge: (persisted, current) => {
        try {
          const p = persisted as Partial<Pick<FrictionStoreState, "reports">> | undefined;
          return {
            ...current,
            reports: sanitizeReports(p?.reports),
          };
        } catch (e) {
          console.warn("[FrictionMap] Persist merge failed, using seed data.", e);
          return {
            ...current,
            reports: [...SEED_FRICTION_REPORTS],
          };
        }
      },
    },
  ),
);

export function selectFilteredReports(state: FrictionStoreState): FrictionReport[] {
  return filterReports(state.reports, state.filters);
}

export function selectDashboardMetrics(state: FrictionStoreState) {
  return buildDashboardMetrics(selectFilteredReports(state), AVERAGE_HOURLY_COST);
}

export function selectRoadmapItems(state: FrictionStoreState) {
  return generateRoadmapItems(selectFilteredReports(state));
}

export { AVERAGE_HOURLY_COST };
