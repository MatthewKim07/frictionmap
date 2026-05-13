import { SIGNUP_ROLE_LABELS, type DirectoryUser } from "@/types/orgDirectory";

export function PendingAccessScreen({
  user,
  onSignOut,
}: {
  user: DirectoryUser;
  onSignOut: () => void;
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
          Employees cannot submit reports or view operational data until they are invited into the workspace.
        </div>
        <button type="button" className="btn secondary" onClick={onSignOut}>
          Sign out
        </button>
      </section>
    </main>
  );
}
