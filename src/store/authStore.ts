import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SimulationRole } from "@/constants/companySettings";
import { sanitizeSimulationRole } from "@/constants/companySettings";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchProfileForUser, type RemoteProfile } from "@/lib/supabaseProfile";
import type { AuthMethodKind, DirectoryUser, SeniorityLevel } from "@/types/orgDirectory";

const AUTH_STORAGE_KEY = "frictionmap-auth-v1";
const AUTH_PERSIST_VERSION = 1;

function newUserId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `usr-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function seedDirectory(): DirectoryUser[] {
  return [
    {
      id: newUserId(),
      displayName: "Alex Rivera",
      email: "alex@company.local",
      seniority: "director",
      orgRole: "admin",
      authMethods: ["password", "magic_link", "sso"],
      passwordPlain: "demo",
      ssoSubject: "alex@company.local",
    },
    {
      id: newUserId(),
      displayName: "Jordan Lee",
      email: "jordan@company.local",
      seniority: "senior",
      orgRole: "manager",
      authMethods: ["password", "magic_link"],
      passwordPlain: "demo",
    },
    {
      id: newUserId(),
      displayName: "Sam Okonkwo",
      email: "sam@company.local",
      seniority: "mid",
      orgRole: "employee",
      authMethods: ["password", "magic_link", "sso"],
      passwordPlain: "demo",
    },
  ];
}

export interface NewDirectoryUserInput {
  displayName: string;
  email: string;
  seniority: SeniorityLevel;
  orgRole: SimulationRole;
  authMethods: AuthMethodKind[];
  passwordPlain?: string;
  ssoSubject?: string;
}

function remoteProfileToDirectoryUser(p: RemoteProfile): DirectoryUser {
  return {
    id: p.id,
    displayName: p.displayName,
    email: p.email,
    seniority: p.seniority,
    orgRole: p.orgRole,
    authMethods: ["password"],
  };
}

export interface AuthStoreState {
  directoryUsers: DirectoryUser[];
  sessionUserId: string | null;
  loginPanelOpen: boolean;
  remoteProfile: RemoteProfile | null;

  setLoginPanelOpen: (open: boolean) => void;
  setRemoteProfile: (profile: RemoteProfile | null) => void;
  signOut: () => void;

  signInWithPassword: (email: string, password: string) => { ok: true } | { ok: false; message: string };
  signInWithMagicLink: (email: string) => { ok: true } | { ok: false; message: string };
  signInWithSso: (userId: string) => { ok: true } | { ok: false; message: string };

  signInWithSupabasePassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  requestSupabaseEmailOtp: (email: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  verifySupabaseEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  signInWithGoogleOAuth: () => Promise<{ ok: true } | { ok: false; message: string }>;

  addDirectoryUser: (input: NewDirectoryUserInput) => DirectoryUser | { error: string };
  updateDirectoryUser: (id: string, patch: Partial<NewDirectoryUserInput>) => { ok: true } | { error: string };
  removeDirectoryUser: (id: string) => { ok: true } | { error: string };
}

function countAdmins(users: DirectoryUser[]): number {
  return users.filter((u) => u.orgRole === "admin").length;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      directoryUsers: seedDirectory(),
      sessionUserId: null,
      loginPanelOpen: false,
      remoteProfile: null,

      setLoginPanelOpen: (open) => set({ loginPanelOpen: open }),

      setRemoteProfile: (profile) => set({ remoteProfile: profile }),

      signOut: () => {
        void getSupabaseClient()?.auth.signOut();
        set({ sessionUserId: null, loginPanelOpen: false, remoteProfile: null });
      },

      signInWithPassword: (email, password) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const e = normalizeAuthEmail(email);
        const u = get().directoryUsers.find((x) => normalizeAuthEmail(x.email) === e);
        if (!u) return { ok: false, message: "No teammate found with that email." };
        if (!u.authMethods.includes("password")) return { ok: false, message: "Password sign-in is not enabled for this profile." };
        if (!u.passwordPlain) return { ok: false, message: "No password is set for this profile — use magic link or SSO, or ask an admin to add one in Team directory." };
        if (u.passwordPlain !== password) return { ok: false, message: "Incorrect password." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true };
      },

      signInWithMagicLink: (email) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const e = normalizeAuthEmail(email);
        const u = get().directoryUsers.find((x) => normalizeAuthEmail(x.email) === e);
        if (!u) return { ok: false, message: "No teammate found with that email." };
        if (!u.authMethods.includes("magic_link")) return { ok: false, message: "Magic link is not enabled for this profile." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true };
      },

      signInWithSso: (userId) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const u = get().directoryUsers.find((x) => x.id === userId);
        if (!u) return { ok: false, message: "Invalid SSO selection." };
        if (!u.authMethods.includes("sso")) return { ok: false, message: "SSO is not enabled for this profile." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true };
      },

      signInWithSupabasePassword: async (email, password) => {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, message: "Supabase is not configured (missing VITE_SUPABASE_URL / ANON_KEY)." };
        set({ sessionUserId: null });
        const { error } = await sb.auth.signInWithPassword({ email: normalizeAuthEmail(email), password });
        if (error) return { ok: false, message: error.message };
        const session = (await sb.auth.getSession()).data.session;
        if (!session?.user) return { ok: false, message: "No session after sign-in." };
        const prof = await fetchProfileForUser(sb, session.user.id, session.user.email ?? email);
        if (!prof) {
          await sb.auth.signOut();
          return {
            ok: false,
            message:
              "No profile row for this account. Run docs/supabase-auth-profiles.sql in the Supabase SQL editor, then try again.",
          };
        }
        set({ remoteProfile: prof, loginPanelOpen: false });
        return { ok: true };
      },

      requestSupabaseEmailOtp: async (email) => {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, message: "Supabase is not configured." };
        const { error } = await sb.auth.signInWithOtp({
          email: normalizeAuthEmail(email),
          options: { shouldCreateUser: false },
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },

      verifySupabaseEmailOtp: async (email, token) => {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, message: "Supabase is not configured." };
        set({ sessionUserId: null });
        const { data, error } = await sb.auth.verifyOtp({
          email: normalizeAuthEmail(email),
          token: token.replace(/\s/g, ""),
          type: "email",
        });
        if (error) return { ok: false, message: error.message };
        const user = data.user;
        if (!user) return { ok: false, message: "No user returned from OTP." };
        const prof = await fetchProfileForUser(sb, user.id, user.email ?? email);
        if (!prof) {
          await sb.auth.signOut();
          return {
            ok: false,
            message:
              "No profile row for this account. Run docs/supabase-auth-profiles.sql in the Supabase SQL editor, then try again.",
          };
        }
        set({ remoteProfile: prof, loginPanelOpen: false });
        return { ok: true };
      },

      signInWithGoogleOAuth: async () => {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, message: "Supabase is not configured." };
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },

      addDirectoryUser: (input) => {
        const displayName = input.displayName.trim().replace(/\s+/g, " ");
        const email = normalizeAuthEmail(input.email);
        if (!displayName || displayName.length > 80) return { error: "Enter a display name (max 80 characters)." };
        if (!email || !email.includes("@")) return { error: "Enter a valid email." };
        if (get().directoryUsers.some((x) => normalizeAuthEmail(x.email) === email)) {
          return { error: "That email is already in the directory." };
        }
        const user: DirectoryUser = {
          id: newUserId(),
          displayName,
          email,
          seniority: input.seniority,
          orgRole: sanitizeSimulationRole(input.orgRole),
          authMethods: input.authMethods.length > 0 ? [...input.authMethods] : ["password"],
          passwordPlain: input.passwordPlain?.trim() || undefined,
          ssoSubject: input.ssoSubject?.trim() || undefined,
        };
        set((s) => ({ directoryUsers: [...s.directoryUsers, user] }));
        return user;
      },

      updateDirectoryUser: (id, patch) => {
        const users = get().directoryUsers;
        const idx = users.findIndex((x) => x.id === id);
        if (idx < 0) return { error: "Person not found." };

        const nextEmail = patch.email !== undefined ? normalizeAuthEmail(patch.email) : users[idx]!.email;
        if (patch.email !== undefined) {
          if (!nextEmail.includes("@")) return { error: "Enter a valid email." };
          const dup = users.some((x, i) => i !== idx && normalizeAuthEmail(x.email) === nextEmail);
          if (dup) return { error: "That email is already used by someone else." };
        }

        const nextRole = patch.orgRole !== undefined ? sanitizeSimulationRole(patch.orgRole) : users[idx]!.orgRole;
        const trial = users.map((u, i) =>
          i === idx
            ? {
                ...u,
                displayName: patch.displayName !== undefined ? patch.displayName.trim().replace(/\s+/g, " ") || u.displayName : u.displayName,
                email: nextEmail,
                seniority: patch.seniority ?? u.seniority,
                orgRole: nextRole,
                authMethods: patch.authMethods !== undefined ? [...patch.authMethods] : u.authMethods,
                passwordPlain: patch.passwordPlain !== undefined ? patch.passwordPlain.trim() || undefined : u.passwordPlain,
                ssoSubject: patch.ssoSubject !== undefined ? patch.ssoSubject.trim() || undefined : u.ssoSubject,
              }
            : u,
        );

        if (countAdmins(trial) < 1) return { error: "Keep at least one Administrator in the directory." };

        set({ directoryUsers: trial });
        return { ok: true };
      },

      removeDirectoryUser: (id) => {
        const users = get().directoryUsers;
        if (users.length <= 1) return { error: "Cannot remove the last person in the directory." };
        const target = users.find((x) => x.id === id);
        if (!target) return { error: "Person not found." };
        const next = users.filter((x) => x.id !== id);
        if (countAdmins(next) < 1) return { error: "Cannot remove the last Administrator." };
        set((s) => ({
          directoryUsers: next,
          sessionUserId: s.sessionUserId === id ? null : s.sessionUserId,
        }));
        return { ok: true };
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: AUTH_PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        directoryUsers: s.directoryUsers,
        sessionUserId: s.sessionUserId,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return { ...current };
        const p = persisted as Partial<AuthStoreState>;
        const directoryUsers = Array.isArray(p.directoryUsers) && p.directoryUsers.length > 0 ? p.directoryUsers : current.directoryUsers;
        const sessionUserId =
          typeof p.sessionUserId === "string" && directoryUsers.some((u) => u.id === p.sessionUserId)
            ? p.sessionUserId
            : null;
        return {
          ...current,
          directoryUsers,
          sessionUserId,
          remoteProfile: null,
        };
      },
    },
  ),
);

export function selectSessionUser(state: AuthStoreState): DirectoryUser | null {
  if (state.remoteProfile) return remoteProfileToDirectoryUser(state.remoteProfile);
  if (!state.sessionUserId) return null;
  return state.directoryUsers.find((u) => u.id === state.sessionUserId) ?? null;
}
