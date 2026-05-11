/**
 * Back-compat entry: default seeded reports mirror **Default Operations Team** demo scenario.
 * Prefer `cloneScenarioReports` from `@/data/demoScenarios` for scenario-aware copies.
 */
import { cloneScenarioReports } from "@/data/demoScenarios";

export function getDefaultReportsSnapshot() {
  return cloneScenarioReports("operations");
}

/** @deprecated Prefer `cloneScenarioReports` or store-driven scenario data. */
export const SEED_FRICTION_REPORTS = getDefaultReportsSnapshot();
