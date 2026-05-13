import { useCallback, useEffect, useState } from "react";

import { SIMULATION_ROLE_LABELS, SIMULATION_ROLES, type SimulationRole } from "@/constants/companySettings";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchAllProfiles, updateProfileRow, type RemoteProfile } from "@/lib/supabaseProfile";
import { useFrictionStore } from "@/store/frictionStore";
import {
  ACCOUNT_STATUS_LABELS,
  SENIORITY_LABELS,
  SENIORITY_LEVELS,
  SIGNUP_ROLE_LABELS,
  type SeniorityLevel,
} from "@/types/orgDirectory";

export function RemoteTeamDirectorySection() {
  const pulseToast = useFrictionStore((s) => s.pulseToast);
  const syncPageForAuthChange = useFrictionStore((s) => s.syncPageForAuthChange);

  const [rows, setRows] = useState<RemoteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    setLoading(true);
    try {
      const list = await fetchAllProfiles(sb);
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <section className="card" style={{ padding: "20px 22px", gridColumn: "1 / -1" }}>
      <h2 style={{ fontSize: 17, marginBottom: 10 }}>Team directory</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
        Manage workspace members, approve new sign-ups, and assign the roles that control what each person can open.
      </p>
      {loading ? (
        <p style={{ color: "var(--ink-soft)" }}>Loading roster…</p>
      ) : rows.length === 0 ? (
        <p className="hint">No team members found yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
                <th style={{ padding: "8px 8px 8px 0", color: "var(--ink-mute)", fontWeight: 600 }}>Name</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Seniority</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Access</th>
                <th style={{ padding: "8px 0 8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <RemoteRow
                  key={u.id}
                  user={u}
                  editing={editingId === u.id}
                  onEdit={() => setEditingId(u.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={async (patch) => {
                    const sb = getSupabaseClient();
                    if (!sb) return;
                    if (u.orgRole === "admin" && patch.org_role && patch.org_role !== "admin") {
                      const remainingAdmins = rows.filter((r) => r.id !== u.id && r.orgRole === "admin").length;
                      if (remainingAdmins < 1) {
                        pulseToast("Keep at least one Administrator.");
                        return;
                      }
                    }
                    const res = await updateProfileRow(sb, u.id, {
                      display_name: patch.display_name,
                      org_role: patch.org_role,
                      seniority: patch.seniority,
                      account_status: patch.account_status,
                      approved_at: patch.account_status === "active" ? new Date().toISOString() : undefined,
                    });
                    if (!res.ok) {
                      pulseToast(res.message);
                      return;
                    }
                    pulseToast("Saved.");
                    setEditingId(null);
                    await reload();
                    syncPageForAuthChange();
                  }}
                  onApprove={async () => {
                    const sb = getSupabaseClient();
                    if (!sb) return;
                    const res = await updateProfileRow(sb, u.id, {
                      account_status: "active",
                      approved_at: new Date().toISOString(),
                    });
                    if (!res.ok) {
                      pulseToast(res.message);
                      return;
                    }
                    pulseToast(`Approved ${u.displayName}.`);
                    await reload();
                    syncPageForAuthChange();
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RemoteRow({
  user,
  editing,
  onEdit,
  onCancel,
  onSave,
  onApprove,
}: {
  user: RemoteProfile;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: { display_name?: string; org_role?: string; seniority?: string; account_status?: string }) => void | Promise<void>;
  onApprove: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState({
    displayName: user.displayName,
    orgRole: user.orgRole,
    seniority: user.seniority,
    accountStatus: user.accountStatus,
  });

  useEffect(() => {
    if (editing) {
      setDraft({
        displayName: user.displayName,
        orgRole: user.orgRole,
        seniority: user.seniority,
        accountStatus: user.accountStatus,
      });
    }
  }, [editing, user]);

  if (!editing) {
    return (
      <tr style={{ borderBottom: "1px solid var(--rule)" }}>
        <td style={{ padding: "10px 8px 10px 0", fontWeight: 500 }}>{user.displayName}</td>
        <td style={{ padding: "10px 8px", color: "var(--ink-soft)" }}>{user.email}</td>
        <td style={{ padding: "10px 8px" }}>{SENIORITY_LABELS[user.seniority]}</td>
        <td style={{ padding: "10px 8px" }}>{SIMULATION_ROLE_LABELS[user.orgRole]}</td>
        <td style={{ padding: "10px 8px" }}>
          <span className={`pill ${user.accountStatus === "pending" ? "amber" : "lime"}`}>
            {ACCOUNT_STATUS_LABELS[user.accountStatus]}
          </span>
          {user.accountStatus === "pending" ? (
            <span style={{ display: "block", marginTop: 4, color: "var(--ink-mute)", fontSize: 12 }}>
              Requested {SIGNUP_ROLE_LABELS[user.requestedRole]}
            </span>
          ) : null}
        </td>
        <td style={{ padding: "10px 0 10px 8px", whiteSpace: "nowrap" }}>
          <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onEdit}>
            Edit
          </button>
          {user.accountStatus === "pending" ? (
            <button
              type="button"
              className="btn coral"
              style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }}
              onClick={() => void onApprove()}
            >
              Approve
            </button>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--rule)", verticalAlign: "top" }}>
      <td colSpan={6} style={{ padding: "12px 0" }}>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
            alignItems: "end",
          }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`rp-name-${user.id}`}>Display name</label>
            <input
              id={`rp-name-${user.id}`}
              className="input"
              value={draft.displayName}
              onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`rp-sen-${user.id}`}>Seniority</label>
            <select
              id={`rp-sen-${user.id}`}
              className="select"
              value={draft.seniority}
              onChange={(e) => setDraft((d) => ({ ...d, seniority: e.target.value as SeniorityLevel }))}
            >
              {SENIORITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {SENIORITY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`rp-role-${user.id}`}>Organization role</label>
            <select
              id={`rp-role-${user.id}`}
              className="select"
              value={draft.orgRole}
              onChange={(e) => setDraft((d) => ({ ...d, orgRole: e.target.value as SimulationRole }))}
            >
              {SIMULATION_ROLES.map((r) => (
                <option key={r} value={r}>
                  {SIMULATION_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`rp-status-${user.id}`}>Access status</label>
            <select
              id={`rp-status-${user.id}`}
              className="select"
              value={draft.accountStatus}
              onChange={(e) => setDraft((d) => ({ ...d, accountStatus: e.target.value as "pending" | "active" }))}
            >
              <option value="pending">{ACCOUNT_STATUS_LABELS.pending}</option>
              <option value="active">{ACCOUNT_STATUS_LABELS.active}</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn coral"
              onClick={() =>
                void onSave({
                  display_name: draft.displayName.trim(),
                  org_role: draft.orgRole,
                  seniority: draft.seniority,
                  account_status: draft.accountStatus,
                })
              }
            >
              Save
            </button>
            <button type="button" className="btn secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
