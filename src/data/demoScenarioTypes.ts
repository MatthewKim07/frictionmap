import { DEFAULT_HOURLY_RATE, MAX_HOURLY_RATE, MIN_HOURLY_RATE } from "@/constants/friction";

export const DEMO_SCENARIO_IDS = ["operations", "engineering_handoff_chaos", "finance_manual_workload"] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

export const DEMO_SCENARIO_LABELS: Record<DemoScenarioId, string> = {
  operations: "Default Operations Team",
  engineering_handoff_chaos: "Engineering Handoff Chaos",
  finance_manual_workload: "Finance Manual Workload",
};

export const DEMO_SCENARIO_SHORT: Record<DemoScenarioId, string> = {
  operations: "Balanced cross-team slowdowns for a realistic company snapshot.",
  engineering_handoff_chaos: "Docs gaps, permissions, rework, duplicate tools across Engineering.",
  finance_manual_workload: "Heavy manual reconciliation, procurements, and spreadsheet drag in Finance-adjacent work.",
};

export function sanitizeScenarioId(raw: unknown): DemoScenarioId {
  if (typeof raw === "string" && DEMO_SCENARIO_IDS.includes(raw as DemoScenarioId)) {
    return raw as DemoScenarioId;
  }
  return "operations";
}

export function sanitizeHourlyRate(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_HOURLY_RATE;
  return Math.round(Math.min(MAX_HOURLY_RATE, Math.max(MIN_HOURLY_RATE, n)));
}
