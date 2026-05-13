import type { SupabaseClient } from "@supabase/supabase-js";

import type { SimulationRole } from "@/constants/companySettings";
import { sanitizeSimulationRole } from "@/constants/companySettings";
import { SENIORITY_LEVELS, type SeniorityLevel } from "@/types/orgDirectory";

export const PROFILES_TABLE = "profiles";

export interface RemoteProfile {
  id: string;
  email: string;
  displayName: string;
  orgRole: SimulationRole;
  seniority: SeniorityLevel;
}

export interface ProfileRow {
  id: string;
  email?: string | null;
  display_name: string;
  org_role: string;
  seniority: string;
}

function sanitizeSeniority(raw: string): SeniorityLevel {
  return (SENIORITY_LEVELS as readonly string[]).includes(raw) ? (raw as SeniorityLevel) : "mid";
}

export function mapProfileRow(row: ProfileRow, emailFallback: string): RemoteProfile {
  return {
    id: row.id,
    email: (row.email ?? emailFallback).trim().toLowerCase(),
    displayName: row.display_name?.trim() || emailFallback.split("@")[0] || "User",
    orgRole: sanitizeSimulationRole(row.org_role),
    seniority: sanitizeSeniority(row.seniority ?? "mid"),
  };
}

export async function fetchProfileForUser(
  supabase: SupabaseClient,
  userId: string,
  emailFallback: string,
): Promise<RemoteProfile | null> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, display_name, org_role, seniority")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfileRow(data as ProfileRow, emailFallback);
}

export async function fetchAllProfiles(supabase: SupabaseClient): Promise<RemoteProfile[]> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, display_name, org_role, seniority")
    .order("display_name", { ascending: true });
  if (error || !data) return [];
  return (data as (ProfileRow & { email?: string })[]).map((row) =>
    mapProfileRow(
      { id: row.id, display_name: row.display_name, org_role: row.org_role, seniority: row.seniority, email: row.email },
      row.email ?? "user@unknown",
    ),
  );
}

export async function updateProfileRow(
  supabase: SupabaseClient,
  userId: string,
  patch: { display_name?: string; org_role?: string; seniority?: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from(PROFILES_TABLE).update(patch).eq("id", userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
