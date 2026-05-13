import { useEffect, useMemo, useState } from "react";

import { SIMULATION_ROLE_LABELS, SIMULATION_ROLES, type SimulationRole } from "@/constants/companySettings";
import { useFrictionStore } from "@/store/frictionStore";
import type { NewDirectoryUserInput } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";
import {
  AUTH_METHOD_KINDS,
  AUTH_METHOD_LABELS,
  SENIORITY_LABELS,
  SENIORITY_LEVELS,
  type AuthMethodKind,
  type DirectoryUser,
  type SeniorityLevel,
} from "@/types/orgDirectory";

const emptyForm = {
  displayName: "",
  email: "",
  seniority: "mid" as SeniorityLevel,
  orgRole: "employee" as SimulationRole,
  passwordPlain: "demo",
  authMethods: ["password", "magic_link"] as AuthMethodKind[],
};

export function TeamDirectorySection() {
  const directoryUsers = useAuthStore((s) => s.directoryUsers);
  const addDirectoryUser = useAuthStore((s) => s.addDirectoryUser);
  const updateDirectoryUser = useAuthStore((s) => s.updateDirectoryUser);
  const removeDirectoryUser = useAuthStore((s) => s.removeDirectoryUser);
  const pulseToast = useFrictionStore((s) => s.pulseToast);
  const syncPageForAuthChange = useFrictionStore((s) => s.syncPageForAuthChange);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...directoryUsers].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [directoryUsers],
  );

  const toggleMethod = (m: AuthMethodKind, list: AuthMethodKind[], onChange: (next: AuthMethodKind[]) => void) => {
    if (list.includes(m)) onChange(list.filter((x) => x !== m));
    else onChange([...list, m]);
  };

  const submitAdd = () => {
    const res = addDirectoryUser({
      displayName: form.displayName,
      email: form.email,
      seniority: form.seniority,
      orgRole: form.orgRole,
      authMethods: form.authMethods,
      passwordPlain: form.passwordPlain || undefined,
    });
    if ("error" in res) {
      pulseToast(res.error);
      return;
    }
    pulseToast(`Added ${res.displayName} to the directory.`);
    setForm(emptyForm);
    syncPageForAuthChange();
  };

  return (
    <section className="card" style={{ padding: "20px 22px", gridColumn: "1 / -1" }}>
      <h2 style={{ fontSize: 17, marginBottom: 10 }}>Team directory</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.55 }}>
        Add people, set <strong>seniority</strong> (job ladder), and assign <strong>organization roles</strong> (what they can open in FrictionMap). Sign-in methods are simulated locally — swap in Supabase Auth for production.
      </p>

      <div
        style={{
          display: "grid",
          gap: 16,
          marginBottom: 22,
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
          alignItems: "end",
        }}
      >
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="td-name">Display name</label>
          <input
            id="td-name"
            className="input"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="Jamie Chen"
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="td-email">Email</label>
          <input
            id="td-email"
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="jamie@company.com"
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="td-seniority">Seniority</label>
          <select
            id="td-seniority"
            className="select"
            value={form.seniority}
            onChange={(e) => setForm((f) => ({ ...f, seniority: e.target.value as SeniorityLevel }))}
          >
            {SENIORITY_LEVELS.map((s) => (
              <option key={s} value={s}>
                {SENIORITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="td-role">Organization role</label>
          <select
            id="td-role"
            className="select"
            value={form.orgRole}
            onChange={(e) => setForm((f) => ({ ...f, orgRole: e.target.value as SimulationRole }))}
          >
            {SIMULATION_ROLES.map((r) => (
              <option key={r} value={r}>
                {SIMULATION_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="td-pass">Demo password (optional)</label>
          <input
            id="td-pass"
            className="input"
            type="text"
            autoComplete="off"
            value={form.passwordPlain}
            onChange={(e) => setForm((f) => ({ ...f, passwordPlain: e.target.value }))}
            placeholder="Leave blank to disable password sign-in"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>Sign-in methods</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginTop: 8 }}>
            {AUTH_METHOD_KINDS.map((m) => (
              <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.authMethods.includes(m)}
                  onChange={() => toggleMethod(m, form.authMethods, (next) => setForm((f) => ({ ...f, authMethods: next })))}
                />
                {AUTH_METHOD_LABELS[m]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <button type="button" className="btn coral" onClick={submitAdd}>
            Add person
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <caption className="visually-hidden">Team directory</caption>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--rule-strong)", textAlign: "left" }}>
              <th scope="col" style={{ padding: "8px 8px 8px 0", color: "var(--ink-mute)", fontWeight: 600 }}>
                Name
              </th>
              <th scope="col" style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                Email
              </th>
              <th scope="col" style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                Seniority
              </th>
              <th scope="col" style={{ padding: "8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                Role
              </th>
              <th scope="col" style={{ padding: "8px 0 8px 8px", color: "var(--ink-mute)", fontWeight: 600 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <DirectoryRow
                key={u.id}
                user={u}
                editing={editingId === u.id}
                onEdit={() => setEditingId(u.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(patch) => {
                  const r = updateDirectoryUser(u.id, patch);
                  if ("error" in r) pulseToast(r.error);
                  else {
                    pulseToast("Saved.");
                    setEditingId(null);
                    syncPageForAuthChange();
                  }
                }}
                onRemove={() => {
                  const r = removeDirectoryUser(u.id);
                  if ("error" in r) pulseToast(r.error);
                  else {
                    pulseToast("Removed from directory.");
                    syncPageForAuthChange();
                  }
                }}
                toggleMethod={toggleMethod}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DirectoryRow({
  user,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
  toggleMethod,
}: {
  user: DirectoryUser;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<NewDirectoryUserInput>) => void;
  onRemove: () => void;
  toggleMethod: (m: AuthMethodKind, list: AuthMethodKind[], onChange: (next: AuthMethodKind[]) => void) => void;
}) {
  const [draft, setDraft] = useState({
    displayName: user.displayName,
    email: user.email,
    seniority: user.seniority,
    orgRole: user.orgRole,
    passwordPlain: user.passwordPlain ?? "",
    authMethods: [...user.authMethods] as AuthMethodKind[],
  });

  useEffect(() => {
    if (editing) {
      setDraft({
        displayName: user.displayName,
        email: user.email,
        seniority: user.seniority,
        orgRole: user.orgRole,
        passwordPlain: user.passwordPlain ?? "",
        authMethods: [...user.authMethods] as AuthMethodKind[],
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
        <td style={{ padding: "10px 0 10px 8px", whiteSpace: "nowrap" }}>
          <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12, marginRight: 6 }} onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={onRemove}>
            Remove
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
            <label htmlFor={`e-name-${user.id}`}>Display name</label>
            <input
              id={`e-name-${user.id}`}
              className="input"
              value={draft.displayName}
              onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`e-email-${user.id}`}>Email</label>
            <input
              id={`e-email-${user.id}`}
              className="input"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`e-sen-${user.id}`}>Seniority</label>
            <select
              id={`e-sen-${user.id}`}
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
            <label htmlFor={`e-role-${user.id}`}>Organization role</label>
            <select
              id={`e-role-${user.id}`}
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
            <label htmlFor={`e-pass-${user.id}`}>Demo password</label>
            <input
              id={`e-pass-${user.id}`}
              className="input"
              value={draft.passwordPlain}
              onChange={(e) => setDraft((d) => ({ ...d, passwordPlain: e.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>Sign-in methods</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginTop: 8 }}>
              {AUTH_METHOD_KINDS.map((m) => (
                <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={draft.authMethods.includes(m)}
                    onChange={() => toggleMethod(m, draft.authMethods, (next) => setDraft((d) => ({ ...d, authMethods: next })))}
                  />
                  {AUTH_METHOD_LABELS[m]}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn coral"
              onClick={() =>
                onSave({
                  displayName: draft.displayName,
                  email: draft.email,
                  seniority: draft.seniority,
                  orgRole: draft.orgRole,
                  authMethods: draft.authMethods,
                  passwordPlain: draft.passwordPlain,
                })
              }
            >
              Save
            </button>
            <button type="button" className="btn secondary" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
