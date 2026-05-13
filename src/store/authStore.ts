import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SimulationRole } from "@/constants/companySettings";
import { sanitizeSimulationRole } from "@/constants/companySettings";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchProfileForUser, type RemoteProfile } from "@/lib/supabaseProfile";
import type {
  AccountStatus,
  AuthMethodKind,
  DirectoryUser,
  SeniorityLevel,
  SignupRole,
} from "@/types/orgDirectory";

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
      accountStatus: "active",
      requestedRole: "admin",
      authMethods: ["password", "magic_link", "sso"],
      passwordPlain: "demo",
      ssoSubject: "alex@company.local",
      isSeedUser: true,
    },
    {
      id: newUserId(),
      displayName: "Jordan Lee",
      email: "jordan@company.local",
      seniority: "senior",
      orgRole: "manager",
      accountStatus: "active",
      requestedRole: "employee",
      authMethods: ["password", "magic_link"],
      passwordPlain: "demo",
      isSeedUser: true,
    },
    {
      id: newUserId(),
      displayName: "Sam Okonkwo",
      email: "sam@company.local",
      seniority: "mid",
      orgRole: "employee",
      accountStatus: "active",
      requestedRole: "employee",
      authMethods: ["password", "magic_link", "sso"],
      passwordPlain: "demo",
      isSeedUser: true,
    },
  ];
}

export interface NewDirectoryUserInput {
  displayName: string;
  email: string;
  seniority: SeniorityLevel;
  orgRole: SimulationRole;
  accountStatus?: AccountStatus;
  requestedRole?: SignupRole;
  authMethods: AuthMethodKind[];
  passwordPlain?: string;
  ssoSubject?: string;
}

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
  requestedRole: SignupRole;
}

export type AuthPanelMode = "sign-in" | "sign-up";

export type AuthResult = { ok: true; accountStatus: AccountStatus } | { ok: false; message: string };

export function remoteProfileToDirectoryUser(p: RemoteProfile): DirectoryUser {
  return {
    id: p.id,
    displayName: p.displayName,
    email: p.email,
    seniority: p.seniority,
    orgRole: p.orgRole,
    accountStatus: p.accountStatus,
    requestedRole: p.requestedRole,
    authMethods: ["password"],
  };
}

function sameRemoteProfile(a: RemoteProfile | null, b: RemoteProfile | null): boolean {
  return (
    a?.id === b?.id &&
    a?.email === b?.email &&
    a?.displayName === b?.displayName &&
    a?.seniority === b?.seniority &&
    a?.orgRole === b?.orgRole &&
    a?.accountStatus === b?.accountStatus &&
    a?.requestedRole === b?.requestedRole
  );
}

export interface AuthStoreState {
  directoryUsers: DirectoryUser[];
  sessionUserId: string | null;
  loginPanelOpen: boolean;
  authPanelMode: AuthPanelMode;
  remoteProfile: RemoteProfile | null;

  setLoginPanelOpen: (open: boolean, mode?: AuthPanelMode) => void;
  setRemoteProfile: (profile: RemoteProfile | null) => void;
  signOut: () => void;

  signInWithPassword: (email: string, password: string) => AuthResult;
  signUpWithPassword: (input: SignUpInput) => AuthResult;
  signInWithMagicLink: (email: string) => AuthResult;
  signInWithSso: (userId: string) => AuthResult;

  signInWithSupabasePassword: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  signUpWithSupabasePassword: (input: SignUpInput) => Promise<AuthResult>;

  addDirectoryUser: (input: NewDirectoryUserInput) => DirectoryUser | { error: string };
  updateDirectoryUser: (id: string, patch: Partial<NewDirectoryUserInput>) => { ok: true } | { error: string };
  removeDirectoryUser: (id: string) => { ok: true } | { error: string };
}

function countAdmins(users: DirectoryUser[]): number {
  return users.filter((u) => u.orgRole === "admin" && u.accountStatus === "active").length;
}

function normalizeDirectoryUser(user: DirectoryUser): DirectoryUser {
  return {
    ...user,
    isSeedUser:
      user.isSeedUser === true ||
      ["alex@company.local", "jordan@company.local", "sam@company.local"].includes(normalizeAuthEmail(user.email)),
    accountStatus: user.accountStatus === "pending" || user.accountStatus === "active" ? user.accountStatus : "active",
    requestedRole: user.requestedRole === "admin" || user.requestedRole === "employee"
      ? user.requestedRole
      : user.orgRole === "admin"
        ? "admin"
        : "employee",
  };
}

function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function nextSelfSignupAccess(users: DirectoryUser[], requestedRole: SignupRole): Pick<DirectoryUser, "orgRole" | "accountStatus"> {
  const realActiveAdmins = users.filter((u) => !u.isSeedUser && u.orgRole === "admin" && u.accountStatus === "active").length;
  if (realActiveAdmins === 0) return { orgRole: "admin", accountStatus: "active" };
  if (requestedRole === "admin") return { orgRole: "employee", accountStatus: "pending" };
  return { orgRole: "employee", accountStatus: "pending" };
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      directoryUsers: seedDirectory(),
      sessionUserId: null,
      loginPanelOpen: false,
      authPanelMode: "sign-in",
      remoteProfile: null,

      setLoginPanelOpen: (open, mode) => set({ loginPanelOpen: open, authPanelMode: mode ?? get().authPanelMode }),

      setRemoteProfile: (profile) =>
        set((s) => (sameRemoteProfile(s.remoteProfile, profile) ? {} : { remoteProfile: profile })),

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
        if (!u.passwordPlain) return { ok: false, message: "No password is set for this profile — ask an admin to add one in Team directory." };
        if (u.passwordPlain !== password) return { ok: false, message: "Incorrect password." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true, accountStatus: u.accountStatus };
      },

      signUpWithPassword: (input) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const displayName = normalizeDisplayName(input.displayName);
        const email = normalizeAuthEmail(input.email);
        const password = input.password.trim();
        if (!displayName || displayName.length > 80) return { ok: false, message: "Enter your name (max 80 characters)." };
        if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid work email." };
        if (password.length < 6) return { ok: false, message: "Use a password with at least 6 characters." };
        if (get().directoryUsers.some((x) => normalizeAuthEmail(x.email) === email)) {
          return { ok: false, message: "An account already exists for that email." };
        }

        const access = nextSelfSignupAccess(get().directoryUsers, input.requestedRole);
        const user: DirectoryUser = {
          id: newUserId(),
          displayName,
          email,
          seniority: "mid",
          orgRole: access.orgRole,
          accountStatus: access.accountStatus,
          requestedRole: input.requestedRole,
          authMethods: ["password"],
          passwordPlain: password,
        };
        set((s) => ({ directoryUsers: [...s.directoryUsers, user], sessionUserId: user.id, loginPanelOpen: false }));
        return { ok: true, accountStatus: user.accountStatus };
      },

      signInWithMagicLink: (email) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const e = normalizeAuthEmail(email);
        const u = get().directoryUsers.find((x) => normalizeAuthEmail(x.email) === e);
        if (!u) return { ok: false, message: "No teammate found with that email." };
        if (!u.authMethods.includes("magic_link")) return { ok: false, message: "Magic link is not enabled for this profile." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true, accountStatus: u.accountStatus };
      },

      signInWithSso: (userId) => {
        void getSupabaseClient()?.auth.signOut();
        set({ remoteProfile: null });
        const u = get().directoryUsers.find((x) => x.id === userId);
        if (!u) return { ok: false, message: "Invalid SSO selection." };
        if (!u.authMethods.includes("sso")) return { ok: false, message: "SSO is not enabled for this profile." };
        set({ sessionUserId: u.id, loginPanelOpen: false });
        return { ok: true, accountStatus: u.accountStatus };
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
        return { ok: true, accountStatus: prof.accountStatus };
      },

      signUpWithSupabasePassword: async (input) => {
        const sb = getSupabaseClient();
        if (!sb) return { ok: false, message: "Supabase is not configured (missing VITE_SUPABASE_URL / ANON_KEY)." };
        const displayName = normalizeDisplayName(input.displayName);
        const email = normalizeAuthEmail(input.email);
        const password = input.password.trim();
        if (!displayName || displayName.length > 80) return { ok: false, message: "Enter your name (max 80 characters)." };
        if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid work email." };
        if (password.length < 6) return { ok: false, message: "Use a password with at least 6 characters." };
        set({ sessionUserId: null, remoteProfile: null });
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              requested_role: input.requestedRole,
              org_role: input.requestedRole,
            },
          },
        });
        if (error) return { ok: false, message: error.message };
        if (!data.session || !data.user) {
          set({ loginPanelOpen: false });
          return {
            ok: false,
            message: "Account created. Confirm your email if Supabase requires it, then sign in.",
          };
        }
        const prof = await fetchProfileForUser(sb, data.user.id, data.user.email ?? email);
        if (!prof) {
          await sb.auth.signOut();
          return {
            ok: false,
            message:
              "Account created, but no profile row was found. Run docs/supabase-auth-profiles.sql in Supabase, then sign in.",
          };
        }
        set({ remoteProfile: prof, loginPanelOpen: false });
        return { ok: true, accountStatus: prof.accountStatus };
      },

      addDirectoryUser: (input) => {
        const displayName = normalizeDisplayName(input.displayName);
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
          accountStatus: input.accountStatus ?? "active",
          requestedRole: input.requestedRole ?? (input.orgRole === "admin" ? "admin" : "employee"),
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
                accountStatus: patch.accountStatus ?? u.accountStatus,
                requestedRole: patch.requestedRole ?? u.requestedRole,
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
        const directoryUsers =
          Array.isArray(p.directoryUsers) && p.directoryUsers.length > 0
            ? (p.directoryUsers as DirectoryUser[]).map(normalizeDirectoryUser)
            : current.directoryUsers;
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
