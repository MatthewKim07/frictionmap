import { create } from "zustand";

import type { FrictionReport } from "@/types";
import { MOCK_FRICTION_REPORTS } from "@/data/mockReports";

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

interface FrictionStoreState {
  reports: FrictionReport[];
  page: AppPage;
  toast: ToastState;
  setPage: (page: AppPage) => void;
  addReport: (payload: NewFrictionPayload) => FrictionReport;
}

export const useFrictionStore = create<FrictionStoreState>((set) => ({
  reports: MOCK_FRICTION_REPORTS,
  page: "overview",
  toast: null,

  setPage: (page) => set({ page }),

  addReport: (payload) => {
    const id = `f${Math.floor(Math.random() * 9000) + 1000}`;
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
      toast: { msg: "Report submitted. It's on the list." },
    }));

    window.setTimeout(() => set({ toast: null }), 3200);
    return report;
  },
}));
