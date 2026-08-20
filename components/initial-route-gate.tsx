import { useEffect, useState } from "react";
import { usePathname, useRouter } from "expo-router";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadOnboardingState } from "@/lib/onboarding";

export function InitialRouteGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    void loadOnboardingState().then((state) => {
      setLoading(false);
      if (pathname === "/onboarding" || pathname === "/auth" || pathname.startsWith("/oauth")) return;
      router.replace(state.completed ? "/(tabs)" : "/onboarding");
    });
  }, [authLoading, pathname, router]);

  return loading || authLoading ? null : null;
}
