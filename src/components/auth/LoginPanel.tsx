import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore, type AuthPanelMode, type AuthResult } from "@/store/authStore";
import { useFrictionStore } from "@/store/frictionStore";
import { SIGNUP_ROLE_LABELS, type SignupRole } from "@/types/orgDirectory";

function AuthModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`auth-mode-button${active ? " active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function roleSummary(role: SignupRole): string {
  if (role === "admin") return "Set up the workspace, approve teammates, and manage roles.";
  return "Request access to report friction after an administrator approves you.";
}

function resultMessage(result: AuthResult, action: AuthPanelMode): string {
  if (!result.ok) return result.message;
  if (result.accountStatus === "pending") {
    return action === "sign-up"
      ? "Account created. An administrator needs to approve access before you can use FrictionMap."
      : "Signed in. Your account is still waiting for administrator approval.";
  }
  return action === "sign-up" ? "Account created. You're signed in." : "Signed in.";
}

export function LoginPanel() {
  const open = useAuthStore((s) => s.loginPanelOpen);
  const authPanelMode = useAuthStore((s) => s.authPanelMode);
  const setLoginPanelOpen = useAuthStore((s) => s.setLoginPanelOpen);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);
  const signInWithSupabasePassword = useAuthStore((s) => s.signInWithSupabasePassword);
  const signUpWithSupabasePassword = useAuthStore((s) => s.signUpWithSupabasePassword);
  const pulseToast = useFrictionStore((s) => s.pulseToast);
  const syncPageForAuthChange = useFrictionStore((s) => s.syncPageForAuthChange);

  const supabaseOn = isSupabaseConfigured();
  const [mode, setMode] = useState<AuthPanelMode>(authPanelMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<SignupRole>("admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setMode(authPanelMode);
      setMessage(null);
    }
  }, [authPanelMode, open]);

  if (!open) return null;

  const finish = (result: AuthResult, action: AuthPanelMode) => {
    const text = resultMessage(result, action);
    if (result.ok) {
      syncPageForAuthChange();
      pulseToast(text);
      setMessage(null);
      return;
    }
    setMessage({ kind: "error", text });
    pulseToast(text);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "sign-in") {
        const result = supabaseOn
          ? await signInWithSupabasePassword(email, password)
          : signInWithPassword(email, password);
        finish(result, mode);
        return;
      }

      const input = { displayName, email, password, requestedRole };
      const result = supabaseOn ? await signUpWithSupabasePassword(input) : signUpWithPassword(input);
      finish(result, mode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="auth-backdrop"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) setLoginPanelOpen(false);
      }}
    >
      <section
        className="auth-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-panel-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-close" onClick={() => setLoginPanelOpen(false)} aria-label="Close sign-in panel">
          Close
        </button>
        <div style={{ margin: "4px 0 12px", paddingRight: 72 }}>
          <BrandWordmark compact />
        </div>

        <div className="auth-panel-head">
          <p className="auth-eyebrow">Workspace access</p>
          <h2 id="auth-panel-title">{mode === "sign-in" ? "Sign in to FrictionMap" : "Create your account"}</h2>
          <p>
            {mode === "sign-in"
              ? "Use your work email and password. New accounts may stay pending until an active administrator approves them."
              : "Choose the access you need. Everyone gets an active administrator account on this workspace (you can still narrow roles later in Settings)."}
          </p>
        </div>

        <div className="auth-mode-switch" aria-label="Authentication mode">
          <AuthModeButton active={mode === "sign-in"} onClick={() => {
            setMode("sign-in");
            setMessage(null);
          }}>
            Sign in
          </AuthModeButton>
          <AuthModeButton active={mode === "sign-up"} onClick={() => {
            setMode("sign-up");
            setMessage(null);
          }}>
            Create account
          </AuthModeButton>
        </div>

        {message ? (
          <div className={`auth-message ${message.kind}`} role="status">
            {message.text}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          {mode === "sign-up" ? (
            <div className="field">
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                className="input"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jamie Chen"
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="auth-email">Work email</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "sign-up" ? (
            <fieldset className="auth-role-field">
              <legend>Account type</legend>
              {(["admin", "employee"] as const).map((role) => (
                <label key={role} className={`auth-role-card${requestedRole === role ? " active" : ""}`}>
                  <input
                    type="radio"
                    name="requested-role"
                    value={role}
                    checked={requestedRole === role}
                    onChange={() => setRequestedRole(role)}
                  />
                  <span>
                    <strong>{SIGNUP_ROLE_LABELS[role]}</strong>
                    <small>{roleSummary(role)}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <button type="submit" className="btn coral auth-submit" disabled={busy}>
            {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}
