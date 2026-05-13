import { useEffect } from "react";

import { getSupabaseClient } from "@/lib/supabase";
import { fetchProfileForUser } from "@/lib/supabaseProfile";
import { useAuthStore } from "@/store/authStore";

/** Keeps Zustand auth in sync with Supabase session (persisted in localStorage by the Supabase client). */
export function SupabaseAuthSync() {
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;

    let cancelled = false;

    const applySession = async (session: import("@supabase/supabase-js").Session | null) => {
      if (cancelled) return;
      if (!session?.user) {
        useAuthStore.getState().setRemoteProfile(null);
        return;
      }
      const profile = await fetchProfileForUser(sb, session.user.id, session.user.email ?? "");
      if (cancelled) return;
      if (profile) {
        useAuthStore.getState().setRemoteProfile(profile);
      } else {
        useAuthStore.getState().setRemoteProfile(null);
      }
    };

    void sb.auth.getSession().then(({ data }) => {
      void applySession(data.session ?? null);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
