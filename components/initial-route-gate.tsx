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
    void loadOnboardingState().then((state) => {
      if (!active) return;
      setLoading(false);
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
    });
    return () => { active = false; };
  }, [authLoading, isAuthenticated, pathname, router]);

  return loading || authLoading ? null : null;
}
