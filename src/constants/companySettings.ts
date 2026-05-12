import { sanitizeCurrencyCode, type AppCurrencyCode } from "@/constants/currency";
import { TEAMS } from "@/constants/friction";

export const DEFAULT_COMPANY_NAME = "Your organization";

export const SIMULATION_ROLES = ["employee", "manager", "operations", "judge"] as const;
export type SimulationRole = (typeof SIMULATION_ROLES)[number];

export const SIMULATION_ROLE_LABELS: Record<SimulationRole, string> = {
  employee: "Employee",
  manager: "Manager",
  operations: "Operations Leader",
  judge: "Judge Demo",
};

const MAX_NAME = 80;
const MAX_TEAM_LABEL = 64;
const MAX_CUSTOM_TEAMS = 24;

export interface CompanySettingsSlice {
  companyName: string;
  currencyCode: AppCurrencyCode;
  defaultTeam: string;
  customTeams: string[];
  /** Builtin `TEAMS` entries hidden from pickers (not deleted from data). */
  hiddenBuiltinTeams: string[];
  simulationRole: SimulationRole;
}

export function defaultCompanySettings(): CompanySettingsSlice {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    currencyCode: sanitizeCurrencyCode(undefined),
    defaultTeam: TEAMS[5] ?? "Operations",
    customTeams: [],
    hiddenBuiltinTeams: [],
    simulationRole: "employee",
  };
}

function sanitizeTeamLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t || t.length > MAX_TEAM_LABEL) return null;
  return t;
}

export function sanitizeCompanyName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_COMPANY_NAME;
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return DEFAULT_COMPANY_NAME;
  return t.slice(0, MAX_NAME);
}

export function sanitizeDefaultTeam(raw: unknown, fallback: string): string {
  const t = sanitizeTeamLabel(raw);
  return t ?? fallback;
}

export function sanitizeCustomTeams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const t = sanitizeTeamLabel(item);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_CUSTOM_TEAMS) break;
  }
  return out;
}

export function sanitizeHiddenBuiltinTeams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(TEAMS as unknown as string[]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!allowed.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function sanitizeSimulationRole(raw: unknown): SimulationRole {
  return SIMULATION_ROLES.includes(raw as SimulationRole) ? (raw as SimulationRole) : "employee";
}

export function mergeCompanySettings(partial: unknown): CompanySettingsSlice {
  const base = defaultCompanySettings();
  if (typeof partial !== "object" || partial === null || Array.isArray(partial)) return base;
  const o = partial as Record<string, unknown>;
  return {
    companyName: sanitizeCompanyName(o.companyName),
    currencyCode: sanitizeCurrencyCode(o.currencyCode),
    defaultTeam: sanitizeDefaultTeam(o.defaultTeam, base.defaultTeam),
    customTeams: sanitizeCustomTeams(o.customTeams),
    hiddenBuiltinTeams: sanitizeHiddenBuiltinTeams(o.hiddenBuiltinTeams),
    simulationRole: sanitizeSimulationRole(o.simulationRole),
  };
}

/** Teams shown in dropdowns: visible builtins + custom (deduped, stable order). */
export function getEffectiveTeamOptions(settings: CompanySettingsSlice): string[] {
  const hidden = new Set(settings.hiddenBuiltinTeams);
  const builtins = (TEAMS as readonly string[]).filter((t) => !hidden.has(t));
  const custom = settings.customTeams.filter((c) => !builtins.includes(c));
  const merged = [...builtins, ...custom];
  return merged.length > 0 ? merged : [...TEAMS];
}
