import { useEffect, useState } from "react";
import { usePathname, useRouter } from "expo-router";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState } from "@/lib/onboarding";
import { isEntryPath, isOnboardingFlowPath } from "@/lib/auth-flow";

export function InitialRouteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    const route = async () => {
      try {
        const state = await loadOnboardingState();
        if (!active) return;

        if (!isAuthenticated && isEntryPath(pathname)) {
          router.replace("/auth");
          return;
        }

        if (isOnboardingFlowPath(pathname)) return;

        if (isAuthenticated && (pathname === "/" || pathname === "/index")) {
          router.replace("/(tabs)");
          return;
        }

        if (isAuthenticated && isEntryPath(pathname) && !state.completed) {
          router.replace("/onboarding");
        }
      } catch (error) {
        // Routing must never prevent the application from rendering. If local
        // onboarding storage is unavailable/corrupt, leave the current route
        // alone and let the screen handle recovery.
        console.warn("[InitialRouteGate] route initialization failed", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void route();
    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, pathname, router]);

  return loading || authLoading ? null : null;
}
