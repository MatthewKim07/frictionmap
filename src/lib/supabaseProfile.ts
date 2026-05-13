import type { SupabaseClient } from "@supabase/supabase-js";

import type { SimulationRole } from "@/constants/companySettings";
import { sanitizeSimulationRole } from "@/constants/companySettings";
import {
  ACCOUNT_STATUSES,
  SIGNUP_ROLES,
  SENIORITY_LEVELS,
  type AccountStatus,
  type SeniorityLevel,
  type SignupRole,
} from "@/types/orgDirectory";

export const PROFILES_TABLE = "profiles";

export interface RemoteProfile {
  id: string;
  email: string;
  displayName: string;
  orgRole: SimulationRole;
  seniority: SeniorityLevel;
  accountStatus: AccountStatus;
  requestedRole: SignupRole;
}

export interface ProfileRow {
  id: string;
  email?: string | null;
  display_name: string;
  org_role: string;
  seniority: string;
  account_status?: string | null;
  requested_role?: string | null;
}

function sanitizeSeniority(raw: string): SeniorityLevel {
  return (SENIORITY_LEVELS as readonly string[]).includes(raw) ? (raw as SeniorityLevel) : "mid";
}

function sanitizeAccountStatus(raw: string | null | undefined): AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as AccountStatus) : "active";
}

function sanitizeSignupRole(raw: string | null | undefined): SignupRole {
  return (SIGNUP_ROLES as readonly string[]).includes(raw ?? "") ? (raw as SignupRole) : "employee";
}

export function mapProfileRow(row: ProfileRow, emailFallback: string): RemoteProfile {
  return {
    id: row.id,
    email: (row.email ?? emailFallback).trim().toLowerCase(),
    displayName: row.display_name?.trim() || emailFallback.split("@")[0] || "User",
    orgRole: sanitizeSimulationRole(row.org_role),
    seniority: sanitizeSeniority(row.seniority ?? "mid"),
    accountStatus: sanitizeAccountStatus(row.account_status),
    requestedRole: sanitizeSignupRole(row.requested_role),
  };
}

async function selectProfiles(
  supabase: SupabaseClient,
  query: "single" | "all",
  userId?: string,
): Promise<ProfileRow[] | null> {
  const columns = "*";
  let request = supabase.from(PROFILES_TABLE).select(columns);
  if (userId) request = request.eq("id", userId);
  if (query === "all") {
    const { data, error } = await request.order("display_name", { ascending: true });
    if (error) return null;
    return (data ?? []) as ProfileRow[];
  } else {
    const { data, error } = await request.maybeSingle();
    if (error) return null;
    return data ? [data as ProfileRow] : [];
  }
}

export async function fetchProfileForUser(
  supabase: SupabaseClient,
  userId: string,
  emailFallback: string,
): Promise<RemoteProfile | null> {
  const rows = await selectProfiles(supabase, "single", userId);
  if (!rows?.[0]) return null;
  return mapProfileRow(rows[0], emailFallback);
}

export async function fetchAllProfiles(supabase: SupabaseClient): Promise<RemoteProfile[]> {
  const rows = await selectProfiles(supabase, "all");
  if (!rows) return [];
  return rows.map((row) =>
    mapProfileRow(
      {
        id: row.id,
        display_name: row.display_name,
        org_role: row.org_role,
        seniority: row.seniority,
        email: row.email,
        account_status: row.account_status,
        requested_role: row.requested_role,
      },
      row.email ?? "user@unknown",
    ),
  );
}

export async function updateProfileRow(
  supabase: SupabaseClient,
  userId: string,
  patch: {
    display_name?: string;
    org_role?: string;
    seniority?: string;
    account_status?: string;
    requested_role?: string;
    approved_at?: string | null;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from(PROFILES_TABLE).update(patch).eq("id", userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
