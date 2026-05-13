import type { FormEvent } from "react";
import { useState } from "react";

import { useFrictionStore } from "@/store/frictionStore";
import { useAuthStore } from "@/store/authStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AUTH_METHOD_LABELS } from "@/types/orgDirectory";

type LocalTab = "password" | "magic" | "sso";
type CloudTab = "password" | "otp" | "google";

export function LoginPanel() {
  const open = useAuthStore((s) => s.loginPanelOpen);
  const setLoginPanelOpen = useAuthStore((s) => s.setLoginPanelOpen);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink);
  const signInWithSso = useAuthStore((s) => s.signInWithSso);
  const signInWithSupabasePassword = useAuthStore((s) => s.signInWithSupabasePassword);
  const requestSupabaseEmailOtp = useAuthStore((s) => s.requestSupabaseEmailOtp);
  const verifySupabaseEmailOtp = useAuthStore((s) => s.verifySupabaseEmailOtp);
  const signInWithGoogleOAuth = useAuthStore((s) => s.signInWithGoogleOAuth);
  const directoryUsers = useAuthStore((s) => s.directoryUsers);
  const pulseToast = useFrictionStore((s) => s.pulseToast);
  const syncPageForAuthChange = useFrictionStore((s) => s.syncPageForAuthChange);

  const supabaseOn = isSupabaseConfigured();
  const [cloudTab, setCloudTab] = useState<CloudTab>("password");
  const [localTab, setLocalTab] = useState<LocalTab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showOffline, setShowOffline] = useState(false);

  if (!open) return null;

  const ssoCandidates = directoryUsers.filter((u) => u.authMethods.includes("sso"));

  const finishSignIn = (result: { ok: true } | { ok: false; message: string }) => {
    if (result.ok) {
      syncPageForAuthChange();
      pulseToast("Signed in.");
    } else {
      pulseToast(result.message);
    }
  };

  const onLocalPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      finishSignIn(signInWithPassword(email, password));
    } finally {
      setBusy(false);
    }
  };

  const onLocalMagicSubmit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      finishSignIn(signInWithMagicLink(email));
      setBusy(false);
    }, 520);
  };

  const onCloudPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await signInWithSupabasePassword(email, password);
      finishSignIn(r);
    } finally {
      setBusy(false);
    }
  };

  const onSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await requestSupabaseEmailOtp(email);
      if (r.ok) {
        setOtpSent(true);
        pulseToast("Check your email for the sign-in code.");
      } else {
        pulseToast(r.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await verifySupabaseEmailOtp(email, otpToken);
      finishSignIn(r);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const r = await signInWithGoogleOAuth();
      if (!r.ok) pulseToast(r.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="login-panel-backdrop"
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(22, 20, 18, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) setLoginPanelOpen(false);
      }}
    >
      <div
        className="card login-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-panel-title"
        style={{ width: "min(440px, 100%)", padding: "24px 26px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn secondary"
          onClick={() => setLoginPanelOpen(false)}
          style={{ position: "absolute", top: 14, right: 14, padding: "6px 10px", fontSize: 12 }}
          aria-label="Close"
        >
          Close
        </button>
        <h2 id="login-panel-title" style={{ fontSize: 20, margin: "0 0 6px" }}>
          Sign in
        </h2>

        {supabaseOn ? (
          <>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              Use your Supabase project account. Enable <strong>Email</strong> (and optionally <strong>Google</strong>) under
              Authentication → Providers. Run <code style={{ fontSize: 12 }}>docs/supabase-auth-profiles.sql</code> so each user
              gets a row in <code style={{ fontSize: 12 }}>public.profiles</code> (roles drive which tabs you see).
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
              {(
                [
                  ["password", "Email & password"],
                  ["otp", "Email code"],
                  ["google", "Google"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="btn secondary"
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: cloudTab === id ? "2px solid var(--coral)" : undefined,
                  }}
                  aria-pressed={cloudTab === id}
                  onClick={() => {
                    setCloudTab(id);
                    setOtpSent(false);
                    setOtpToken("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {cloudTab === "password" && (
              <form onSubmit={onCloudPasswordSubmit}>
                <div className="field">
                  <label htmlFor="sb-email">Email</label>
                  <input
                    id="sb-email"
                    className="input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="sb-pass">Password</label>
                  <input
                    id="sb-pass"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn coral" style={{ marginTop: 16 }} disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}

            {cloudTab === "otp" && (
              <div>
                {!otpSent ? (
                  <form onSubmit={onSendOtp}>
                    <div className="field">
                      <label htmlFor="sb-otp-email">Email</label>
                      <input
                        id="sb-otp-email"
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <p className="hint" style={{ marginTop: 8 }}>
                      Sends a one-time code (Supabase Auth). The user must already exist in Authentication.
                    </p>
                    <button type="submit" className="btn coral" style={{ marginTop: 16 }} disabled={busy}>
                      {busy ? "Sending…" : "Send code"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={onVerifyOtp}>
                    <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 12 }}>Enter the code sent to {email}</p>
                    <div className="field">
                      <label htmlFor="sb-otp-code">6-digit code</label>
                      <input
                        id="sb-otp-code"
                        className="input"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn coral" style={{ marginTop: 16 }} disabled={busy}>
                      {busy ? "Verifying…" : "Verify and sign in"}
                    </button>
                    <button type="button" className="btn secondary" style={{ marginTop: 10 }} onClick={() => setOtpSent(false)}>
                      Use a different email
                    </button>
                  </form>
                )}
              </div>
            )}

            {cloudTab === "google" && (
              <div>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, marginBottom: 16 }}>
                  Continue with Google. Add <code style={{ fontSize: 12 }}>{typeof window !== "undefined" ? window.location.origin : ""}</code>{" "}
                  to <strong>Redirect URLs</strong> in Supabase → Authentication → URL configuration.
                </p>
                <button type="button" className="btn coral" onClick={() => void onGoogle()} disabled={busy}>
                  {busy ? "Redirecting…" : "Continue with Google"}
                </button>
              </div>
            )}

            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--rule)" }}>
              <button type="button" className="link" onClick={() => setShowOffline((v) => !v)} style={{ fontSize: 14 }}>
                {showOffline ? "Hide" : "Show"} offline demo sign-in (no Supabase account)
              </button>
              {showOffline ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    {(
                      [
                        ["password", "Password"],
                        ["magic", "Magic link"],
                        ["sso", "SSO"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className="btn secondary"
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          outline: localTab === id ? "2px solid var(--lime)" : undefined,
                        }}
                        aria-pressed={localTab === id}
                        onClick={() => setLocalTab(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {localTab === "password" && (
                    <form onSubmit={onLocalPasswordSubmit}>
                      <div className="field">
                        <label htmlFor="lo-email">Demo email</label>
                        <input id="lo-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="field" style={{ marginTop: 10 }}>
                        <label htmlFor="lo-pass">Password</label>
                        <input id="lo-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <p className="hint" style={{ marginTop: 8 }}>Try password <strong>demo</strong> for seeded local users.</p>
                      <button type="submit" className="btn secondary" style={{ marginTop: 12 }} disabled={busy}>
                        Sign in (local)
                      </button>
                    </form>
                  )}
                  {localTab === "magic" && (
                    <form onSubmit={onLocalMagicSubmit}>
                      <div className="field">
                        <label htmlFor="lo-m-email">Demo email</label>
                        <input id="lo-m-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <button type="submit" className="btn secondary" style={{ marginTop: 12 }} disabled={busy}>
                        Simulated magic link
                      </button>
                    </form>
                  )}
                  {localTab === "sso" && (
                    <div>
                      {ssoCandidates.length === 0 ? (
                        <p className="hint">No SSO-enabled demo users.</p>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {ssoCandidates.map((u) => (
                            <li key={u.id} style={{ marginBottom: 8 }}>
                              <button
                                type="button"
                                className="btn secondary"
                                style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
                                onClick={() => finishSignIn(signInWithSso(u.id))}
                              >
                                <span>{u.displayName}</span>
                                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{u.email}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
              Team accounts are stored in this browser. Add <code style={{ fontSize: 12 }}>VITE_SUPABASE_URL</code> and{" "}
              <code style={{ fontSize: 12 }}>VITE_SUPABASE_ANON_KEY</code> to use real Supabase Auth and role-based views from the database.
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
              {(
                [
                  ["password", "Password"],
                  ["magic", "Magic link"],
                  ["sso", "SSO"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="btn secondary"
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: localTab === id ? "2px solid var(--coral)" : undefined,
                  }}
                  aria-pressed={localTab === id}
                  onClick={() => setLocalTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {localTab === "password" && (
              <form onSubmit={onLocalPasswordSubmit}>
                <div className="field">
                  <label htmlFor="login-email">Work email</label>
                  <input
                    id="login-email"
                    className="input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <p className="hint" style={{ marginTop: 8 }}>
                  Seeded demo accounts use password <strong>demo</strong> (see Team directory in Settings).
                </p>
                <button type="submit" className="btn coral" style={{ marginTop: 16 }} disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}
            {localTab === "magic" && (
              <form onSubmit={onLocalMagicSubmit}>
                <div className="field">
                  <label htmlFor="magic-email">Work email</label>
                  <input
                    id="magic-email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <p className="hint" style={{ marginTop: 8 }}>
                  Demo: simulated link — no inbox. Requires {AUTH_METHOD_LABELS.magic_link} on the profile.
                </p>
                <button type="submit" className="btn coral" style={{ marginTop: 16 }} disabled={busy}>
                  {busy ? "Confirming…" : "Send magic link (demo)"}
                </button>
              </form>
            )}
            {localTab === "sso" && (
              <div>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                  Demo SSO: pick a profile. Production uses your IdP + Supabase OAuth.
                </p>
                {ssoCandidates.length === 0 ? (
                  <p className="hint">No teammates have {AUTH_METHOD_LABELS.sso} enabled.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {ssoCandidates.map((u) => (
                      <li key={u.id} style={{ marginBottom: 8 }}>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ width: "100%", justifyContent: "space-between", textAlign: "left" }}
                          onClick={() => finishSignIn(signInWithSso(u.id))}
                        >
                          <span>{u.displayName}</span>
                          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
