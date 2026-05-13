import type { FrictionReport } from "@/types";

function isValidIso(s: string): boolean {
  const t = new Date(s).getTime();
  return Number.isFinite(t);
}

/** Normalize timestamps after load from storage or Supabase (older rows may omit fields). */
export function enrichFrictionReportFromStorage(r: FrictionReport): FrictionReport {
  const updatedAt =
    r.updatedAt && isValidIso(r.updatedAt) ? r.updatedAt : r.createdAt && isValidIso(r.createdAt) ? r.createdAt : new Date().toISOString();
  if (r.status !== "resolved") {
    return { ...r, updatedAt, resolvedAt: undefined };
  }
  let resolvedAt = r.resolvedAt;
  if (!resolvedAt || !isValidIso(resolvedAt)) {
    resolvedAt = updatedAt;
  }
  return { ...r, updatedAt, resolvedAt };
}

/**
 * When a report leaves "resolved", we clear `resolvedAt` so reopened items are not
 * attributed to an old resolution date in Resolution Activity. History is implied
 * by the current resolved set plus `updatedAt` for audit; a full event log is out of scope.
 */
export function applyStatusTransition(prev: FrictionReport, nextStatus: FrictionReport["status"]): FrictionReport {
  const now = new Date().toISOString();
  const next: FrictionReport = { ...prev, status: nextStatus, updatedAt: now };
  if (nextStatus === "resolved") {
    if (prev.status !== "resolved") {
      next.resolvedAt = now;
    } else if (!prev.resolvedAt) {
      next.resolvedAt = now;
    }
  } else {
    next.resolvedAt = undefined;
  }
  return next;
}

export function mergeReportWithTimestampFields(
  prev: FrictionReport,
  updates: Partial<FrictionReport>,
): FrictionReport {
  if (updates.status !== undefined && updates.status !== prev.status) {
    const { status: newStatus, resolvedAt: _ra, updatedAt: _ua, ...rest } = updates;
    return applyStatusTransition({ ...prev, ...rest }, newStatus);
  }
  const now = new Date().toISOString();
  const merged: FrictionReport = { ...prev, ...updates, updatedAt: now };
  if (merged.status !== "resolved") {
    merged.resolvedAt = undefined;
  } else if (!merged.resolvedAt) {
    merged.resolvedAt = prev.resolvedAt ?? now;
  }
  return merged;
}
