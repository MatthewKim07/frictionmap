import { STORAGE_KEY_PRIMARY } from "@/constants/persist";
import { getDefaultReportsSnapshot } from "@/data/frictionReports";
import type { FrictionReport } from "@/types";

import { getSupabaseClient, isSupabaseConfigured, type DataConnectionMode } from "@/lib/supabase";

const LEGACY_STORAGE_KEY = "frictionmap-reports-v2";
const REPORTS_TABLE = "friction_reports";

export interface RepositoryResult<T> {
  data: T;
  mode: DataConnectionMode;
  warning?: string;
}

type DbReportRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  team: string;
  process: string;
  time_lost_hours: number;
  frequency: string;
  severity: string;
  suggestion: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
};

function toDbRow(r: FrictionReport): DbReportRow {
  const updated = r.updatedAt ?? r.createdAt;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    team: r.team,
    process: r.process,
    time_lost_hours: r.timeLostHours,
    frequency: r.frequency,
    severity: r.severity,
    suggestion: r.suggestion ?? "",
    status: r.status,
    created_at: r.createdAt,
    updated_at: updated,
    resolved_at: r.resolvedAt ?? null,
  };
}

function fromDbRow(row: DbReportRow): FrictionReport {
  const base: FrictionReport = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as FrictionReport["category"],
    team: row.team as FrictionReport["team"],
    process: row.process,
    timeLostHours: Number(row.time_lost_hours),
    frequency: row.frequency as FrictionReport["frequency"],
    severity: row.severity as FrictionReport["severity"],
    suggestion: row.suggestion ?? "",
    status: row.status as FrictionReport["status"],
    createdAt: row.created_at,
  };
  if (row.updated_at) base.updatedAt = row.updated_at;
  if (row.resolved_at) base.resolvedAt = row.resolved_at;
  return base;
}

function readReportsFromPersistStorage(): FrictionReport[] | null {
  try {
    const rawPrimary = window.localStorage.getItem(STORAGE_KEY_PRIMARY);
    const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = rawPrimary ?? rawLegacy;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const envelope = parsed as { state?: unknown; reports?: unknown };
    const state =
      envelope.state && typeof envelope.state === "object"
        ? (envelope.state as Record<string, unknown>)
        : (envelope as unknown as Record<string, unknown>);
    const reports = state.reports;
    if (!Array.isArray(reports)) return null;
    return reports as FrictionReport[];
  } catch {
    return null;
  }
}

/** Returns live reports from preferred backend with safe fallback. */
export async function getReports(): Promise<RepositoryResult<FrictionReport[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      data: readReportsFromPersistStorage() ?? getDefaultReportsSnapshot(),
      mode: "local-demo",
    };
  }

  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return {
      data: readReportsFromPersistStorage() ?? getDefaultReportsSnapshot(),
      mode: "offline-fallback",
      warning: "Supabase read failed, using local demo data.",
    };
  }
  return {
    data: (data as DbReportRow[]).map(fromDbRow),
    mode: "supabase-connected",
  };
}

export async function createReport(report: FrictionReport): Promise<RepositoryResult<FrictionReport>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: report, mode: "local-demo" };
  }
  const { data, error } = await supabase.from(REPORTS_TABLE).insert(toDbRow(report)).select("*").single();
  if (error) {
    console.error("[reportRepository] createReport failed:", error);
    return {
      data: report,
      mode: "offline-fallback",
      warning: `Could not save report to Supabase: ${error.message}`,
    };
  }
  return {
    data: fromDbRow(data as DbReportRow),
    mode: "supabase-connected",
  };
}

export async function updateReport(
  id: string,
  updates: Partial<FrictionReport>,
): Promise<RepositoryResult<Partial<FrictionReport> & { id: string }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: { id, ...updates }, mode: "local-demo" };
  }

  const patch: Partial<DbReportRow> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.team !== undefined) patch.team = updates.team;
  if (updates.process !== undefined) patch.process = updates.process;
  if (updates.timeLostHours !== undefined) patch.time_lost_hours = updates.timeLostHours;
  if (updates.frequency !== undefined) patch.frequency = updates.frequency;
  if (updates.severity !== undefined) patch.severity = updates.severity;
  if (updates.suggestion !== undefined) patch.suggestion = updates.suggestion;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.createdAt !== undefined) patch.created_at = updates.createdAt;
  if (updates.updatedAt !== undefined) patch.updated_at = updates.updatedAt;

  const ra = updates.resolvedAt;
  if (ra === null) {
    patch.resolved_at = null;
  } else if (typeof ra === "string") {
    patch.resolved_at = ra;
  } else if (updates.status !== undefined && updates.status !== "resolved") {
    patch.resolved_at = null;
  }

  const { error } = await supabase
    .from(REPORTS_TABLE)
    .update({ ...patch, updated_at: patch.updated_at ?? new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return {
      data: { id, ...updates },
      mode: "offline-fallback",
      warning: "Supabase update failed. Local fallback remains active.",
    };
  }

  return { data: { id, ...updates }, mode: "supabase-connected" };
}

export async function deleteReport(id: string): Promise<RepositoryResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: { id }, mode: "local-demo" };
  }
  const { error } = await supabase.from(REPORTS_TABLE).delete().eq("id", id);
  if (error) {
    return {
      data: { id },
      mode: "offline-fallback",
      warning: "Supabase delete failed. Kept local fallback.",
    };
  }
  return { data: { id }, mode: "supabase-connected" };
}

export async function replaceReports(reports: FrictionReport[]): Promise<RepositoryResult<FrictionReport[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: reports, mode: "local-demo" };
  }

  const { error: deleteError } = await supabase.from(REPORTS_TABLE).delete().neq("id", "");
  if (deleteError) {
    return {
      data: reports,
      mode: "offline-fallback",
      warning: "Supabase replace failed while clearing old reports.",
    };
  }
  if (!reports.length) return { data: reports, mode: "supabase-connected" };

  const payload = reports.map(toDbRow);
  const { error: insertError } = await supabase.from(REPORTS_TABLE).insert(payload);
  if (insertError) {
    return {
      data: reports,
      mode: "offline-fallback",
      warning: "Supabase replace failed while inserting new reports.",
    };
  }
  return { data: reports, mode: "supabase-connected" };
}

export async function clearReports(): Promise<RepositoryResult<[]>> {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { data: [], mode: "local-demo" };
  }
  const { error } = await supabase.from(REPORTS_TABLE).delete().neq("id", "");
  if (error) {
    return {
      data: [],
      mode: "offline-fallback",
      warning: "Supabase clear failed. Keeping local fallback mode.",
    };
  }
  return { data: [], mode: "supabase-connected" };
}
