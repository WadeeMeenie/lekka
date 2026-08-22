export function hasAuthSession(result: unknown): boolean {
  if (!result || typeof result !== "object" || !("data" in result)) return false;
  const data = result.data;
  return Boolean(data && typeof data === "object" && "session" in data && data.session);
}

export function authFailureMessage(error: unknown, fallback = "The request could not be completed. Check your connection and try again."): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string" && error.message.trim()) return error.message;
  return fallback;
}

export function isAuthTimeout(error: unknown): boolean {
  const message = authFailureMessage(error, "").toLowerCase();
  return message.includes("timed out") || message.includes("timeout");
}

export function isOnboardingFlowPath(pathname: string): boolean {
  return ["/onboarding", "/account-intent", "/personal-details", "/business-setup", "/business-invite", "/business-team", "/auth"].some((route) => pathname === route || pathname.startsWith(`${route}/`)) || pathname.startsWith("/oauth");
}

export function isEntryPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/index" || pathname.startsWith("/(tabs)");
}
