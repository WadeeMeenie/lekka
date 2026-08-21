import { useEffect, useState } from "react";
import { usePathname, useRouter } from "expo-router";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState } from "@/lib/onboarding";
import { isEntryPath, isOnboardingFlowPath } from "@/lib/auth-flow";

export function InitialRouteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    void loadOnboardingState().then((state) => {
      setLoading(false);
      if (isOnboardingFlowPath(pathname)) return;
      if (isEntryPath(pathname)) router.replace(state.completed ? "/(tabs)" : "/onboarding");
    });
  }, [authLoading, pathname, router]);

  return loading || authLoading ? null : null;
}
