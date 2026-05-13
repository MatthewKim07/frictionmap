import type { SimulationRole } from "@/constants/companySettings";

/** Job ladder — used for labels and future policy (e.g. approvals). */
export const SENIORITY_LEVELS = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "director",
] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  director: "Director",
};

/** Ways this person may sign in (local demo + optional Supabase later). */
export const AUTH_METHOD_KINDS = ["password", "magic_link", "sso"] as const;

export type AuthMethodKind = (typeof AUTH_METHOD_KINDS)[number];

export const AUTH_METHOD_LABELS: Record<AuthMethodKind, string> = {
  password: "Email & password",
  magic_link: "Magic link (email)",
  sso: "Company SSO",
};

export interface DirectoryUser {
  id: string;
  displayName: string;
  email: string;
  seniority: SeniorityLevel;
  orgRole: SimulationRole;
  /** Which sign-in experiences are enabled for this profile. */
  authMethods: AuthMethodKind[];
  /**
   * Demo / local only — stored in browser storage. Do not use for real secrets.
   * If unset, password sign-in is disabled for this user.
   */
  passwordPlain?: string;
  /** Optional hint for SSO simulation (e.g. corp subject id). */
  ssoSubject?: string;
}
