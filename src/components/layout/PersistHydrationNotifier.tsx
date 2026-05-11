import { useEffect } from "react";

import { useFrictionStore } from "@/store/frictionStore";

/** Surfaces persisted-state repair warnings via the global toast once after rehydrate. */
export function PersistHydrationNotifier() {
  useEffect(() => {
    if (useFrictionStore.persist.hasHydrated()) {
      useFrictionStore.getState().flushPersistRecoverIfAny();
      return undefined;
    }
    return useFrictionStore.persist.onFinishHydration(() => {
      useFrictionStore.getState().flushPersistRecoverIfAny();
    });
  }, []);

  return null;
}
