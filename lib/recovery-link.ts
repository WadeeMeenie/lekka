export function getRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hash = url.split("#")[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function isRecoveryLink(url: string): boolean {
  const hash = url.split("#")[1] ?? "";
  return new URLSearchParams(hash).get("type") === "recovery";
}
