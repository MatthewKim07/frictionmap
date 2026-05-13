import { SIGNUP_ROLE_LABELS, type DirectoryUser } from "@/types/orgDirectory";

export function PendingAccessScreen({
  user,
  onSignOut,
  onBootstrapWorkspace,
  bootstrapBusy = false,
  bootstrapRecoveryState,
}: {
  user: DirectoryUser;
  onSignOut: () => void;
  /** Supabase only: recover when no active admin can open Settings to approve you. */
  onBootstrapWorkspace?: () => void | Promise<void>;
  bootstrapBusy?: boolean;
  /** Shown after a failed bootstrap attempt (e.g. stale admin row still in `profiles`). */
  bootstrapRecoveryState?: { code: string; message: string } | null;
}) {
  return (
    <main className="pending-access" aria-labelledby="pending-access-title">
      <section className="pending-access-panel">
        <p className="auth-eyebrow">Access pending</p>
        <h1 id="pending-access-title">Your FrictionMap account is waiting for approval.</h1>
        <p>
          An administrator needs to approve <strong>{user.email}</strong> before this workspace opens. Requested access:{" "}
          <strong>{SIGNUP_ROLE_LABELS[user.requestedRole]}</strong>.
        </p>
        <div className="pending-access-note" role="note">
          {user.requestedRole === "admin" ? (
            <>
              You asked for <strong>administrator</strong> access. Until an active administrator approves this account, the
              workspace stays closed — you will not be able to manage people, roles, or organization settings yet.
            </>
          ) : (
            <>
              You asked for <strong>employee</strong> access. Until an administrator approves you, you cannot submit friction
              reports or view operational data in this workspace.
            </>
          )}
        </div>
        <div className="pending-access-actions">
          {onBootstrapWorkspace ? (
            <>
              <p className="pending-access-bootstrap-hint">
                Use this only in a <strong>total lockout</strong>: nobody in <strong>public.profiles</strong> is an active
                Administrator or Judge, so no one can open Settings. If teammates are already admins, they should approve you
                under <strong>Settings → Team directory</strong>, or you can edit <strong>your own</strong> row in Supabase (
                <strong>account_status = active</strong>, <strong>org_role = admin</strong>), then sign in again.
              </p>
              <button
                type="button"
                className="btn coral"
                disabled={bootstrapBusy}
                onClick={() => void onBootstrapWorkspace()}
              >
                {bootstrapBusy ? "Working…" : "Activate workspace — I am the first admin"}
              </button>
              {bootstrapRecoveryState ? (
                <div className="pending-access-bootstrap-error" role="alert">
                  <p className="pending-access-bootstrap-error-msg">{bootstrapRecoveryState.message}</p>
                  {bootstrapRecoveryState.code === "admin_exists" ? (
                    <p className="pending-access-bootstrap-foot">
                      <strong>Fastest fix for your own account:</strong> Supabase → <strong>Table Editor → profiles</strong>{" "}
                      → find the row with your email → set <strong>account_status</strong> to <strong>active</strong> and{" "}
                      <strong>org_role</strong> to <strong>admin</strong> (and set <strong>approved_at</strong> if the column
                      exists). Sign out of FrictionMap and sign back in.{" "}
                      <strong>Only if the other admin rows are junk</strong> (old test accounts): demote or delete those
                      rows so no active admin or judge remains, then you can use this button once.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
          <button type="button" className="btn secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
