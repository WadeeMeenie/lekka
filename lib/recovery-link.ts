function getUrlParams(url: string, location: "hash" | "query"): URLSearchParams {
  const value = location === "hash" ? url.split("#")[1] ?? "" : url.split("?")[1]?.split("#")[0] ?? "";
  return new URLSearchParams(value);
}

/** Supabase may return implicit-flow tokens in the fragment or a PKCE code in the query. */
export function getRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const params = getUrlParams(url, "hash");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function getRecoveryCode(url: string): string | null {
  return getUrlParams(url, "query").get("code");
}

export function isRecoveryLink(url: string): boolean {
  return getUrlParams(url, "hash").get("type") === "recovery"
    || getUrlParams(url, "query").get("type") === "recovery";
}
