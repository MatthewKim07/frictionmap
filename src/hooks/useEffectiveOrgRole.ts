import { useMemo } from "react";

import { getEffectiveOrgRole } from "@/lib/effectiveOrgRole";
import { remoteProfileToDirectoryUser, useAuthStore } from "@/store/authStore";
import { useFrictionStore } from "@/store/frictionStore";

export function useEffectiveOrgRole() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const directoryUsers = useAuthStore((s) => s.directoryUsers);
  const remoteProfile = useAuthStore((s) => s.remoteProfile);
  const deviceRole = useFrictionStore((s) => s.companySettings.simulationRole);
  return useMemo(
    () => getEffectiveOrgRole({ sessionUserId, directoryUsers, remoteProfile }, deviceRole),
    [sessionUserId, directoryUsers, remoteProfile, deviceRole],
  );
}

export function useSessionUser() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const directoryUsers = useAuthStore((s) => s.directoryUsers);
  const remoteProfile = useAuthStore((s) => s.remoteProfile);

  return useMemo(() => {
    if (remoteProfile) return remoteProfileToDirectoryUser(remoteProfile);
    if (!sessionUserId) return null;
    return directoryUsers.find((u) => u.id === sessionUserId) ?? null;
  }, [directoryUsers, remoteProfile, sessionUserId]);
}
