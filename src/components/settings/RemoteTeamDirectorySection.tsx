import { useCallback, useEffect, useState } from "react";

import { SIMULATION_ROLE_LABELS, SIMULATION_ROLES, type SimulationRole } from "@/constants/companySettings";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchAllProfiles, updateProfileRow, type RemoteProfile } from "@/lib/supabaseProfile";
import { useFrictionStore } from "@/store/frictionStore";
import { SENIORITY_LABELS, SENIORITY_LEVELS, type SeniorityLevel } from "@/types/orgDirectory";

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
      <h2 style={{ fontSize: 17, marginBottom: 10 }}>Team directory (Supabase)</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
        People and roles are stored in your Supabase project (<code style={{ fontSize: 12 }}>public.profiles</code>). Create
        new accounts under <strong>Authentication → Users</strong> in the Supabase dashboard (or disable email confirmation
        and use sign-up flows). The first person to register becomes <strong>Administrator</strong> automatically.
      </p>
      {loading ? (
        <p style={{ color: "var(--ink-soft)" }}>Loading roster…</p>
      ) : rows.length === 0 ? (
        <p className="hint">No profiles found — run <code>docs/supabase-auth-profiles.sql</code> and sign in once.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
                <th style={{ padding: "8px 8px 8px 0", color: "var(--ink-mute)", fontWeight: 600 }}>Name</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Seniority</th>
                <th style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>Role</th>
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
                        pulseToast("Keep at least one Administrator in Supabase.");
                        return;
                      }
                    }
                    const res = await updateProfileRow(sb, u.id, {
                      display_name: patch.display_name,
                      org_role: patch.org_role,
                      seniority: patch.seniority,
                    });
                    if (!res.ok) {
                      pulseToast(res.message);
                      return;
                    }
                    pulseToast("Saved to Supabase.");
                    setEditingId(null);
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
}: {
  user: RemoteProfile;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: { display_name?: string; org_role?: string; seniority?: string }) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState({
    displayName: user.displayName,
    orgRole: user.orgRole,
    seniority: user.seniority,
  });

  useEffect(() => {
    if (editing) {
      setDraft({ displayName: user.displayName, orgRole: user.orgRole, seniority: user.seniority });
    }
  }, [editing, user]);

  if (!editing) {
    return (
      <tr style={{ borderBottom: "1px solid var(--rule)" }}>
        <td style={{ padding: "10px 8px 10px 0", fontWeight: 500 }}>{user.displayName}</td>
        <td style={{ padding: "10px 8px", color: "var(--ink-soft)" }}>{user.email}</td>
        <td style={{ padding: "10px 8px" }}>{SENIORITY_LABELS[user.seniority]}</td>
        <td style={{ padding: "10px 8px" }}>{SIMULATION_ROLE_LABELS[user.orgRole]}</td>
        <td style={{ padding: "10px 0 10px 8px" }}>
          <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onEdit}>
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--rule)", verticalAlign: "top" }}>
      <td colSpan={5} style={{ padding: "12px 0" }}>
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn coral"
              onClick={() =>
                void onSave({
                  display_name: draft.displayName.trim(),
                  org_role: draft.orgRole,
                  seniority: draft.seniority,
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
