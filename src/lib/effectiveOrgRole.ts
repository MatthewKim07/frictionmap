import { sanitizeSimulationRole, type SimulationRole } from "@/constants/companySettings";
import type { RemoteProfile } from "@/lib/supabaseProfile";
import type { DirectoryUser } from "@/types/orgDirectory";

export interface AuthRoleSlice {
  sessionUserId: string | null;
  directoryUsers: DirectoryUser[];
  /** Supabase session profile — takes precedence over local directory + device role. */
  remoteProfile: RemoteProfile | null;
}

/** Signed-in user: Supabase profile, else local directory row, else device simulation role. */
export function getEffectiveOrgRole(auth: AuthRoleSlice, deviceSimulationRole: SimulationRole): SimulationRole {
  if (auth.remoteProfile) return sanitizeSimulationRole(auth.remoteProfile.orgRole);
  if (auth.sessionUserId) {
    const u = auth.directoryUsers.find((x) => x.id === auth.sessionUserId);
    if (u) return u.orgRole;
  }
  return deviceSimulationRole;
}
