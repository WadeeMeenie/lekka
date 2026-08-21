import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";
import { isOAuthProviderFlagEnabled } from "@/lib/oauth-config";

WebBrowser.maybeCompleteAuthSession();

export type LekkaOAuthProvider = "google" | "azure";
export type OAuthStartResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "configuration_required"; provider: LekkaOAuthProvider }
  | { status: "error"; message: string };

const providerFlags: Record<LekkaOAuthProvider, boolean> = {
  google: isOAuthProviderFlagEnabled(process.env.EXPO_PUBLIC_LEKKA_GOOGLE_OAUTH_ENABLED),
  azure: isOAuthProviderFlagEnabled(process.env.EXPO_PUBLIC_LEKKA_MICROSOFT_OAUTH_ENABLED),
};

export const providerDisplayName: Record<LekkaOAuthProvider, string> = {
  google: "Google",
  azure: "Microsoft",
};

export function isOAuthProviderEnabled(provider: LekkaOAuthProvider) {
  return providerFlags[provider];
}

export function getOAuthRedirectUrl() {
  return Linking.createURL("auth");
}

export async function signInWithSupabaseOAuth(provider: LekkaOAuthProvider): Promise<OAuthStartResult> {
  if (!providerFlags[provider]) return { status: "configuration_required", provider };
  if (!supabase) return { status: "error", message: "Lekka’s secure sign-in service is not configured." };

  const redirectTo = getOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return { status: "error", message: error?.message || "We couldn’t start secure sign-in. Please try again." };

  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "cancel" || result.type === "dismiss") return { status: "cancelled" };
    if (result.type !== "success") return { status: "error", message: "The sign-in window closed before we could finish." };

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) return { status: "error", message: exchangeError.message };
    return { status: "success" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "We couldn’t reach the sign-in provider. Check your connection and try again." };
  }
}
