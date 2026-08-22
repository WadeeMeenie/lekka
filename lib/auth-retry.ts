export type AuthRequestError = { status?: number; message?: string } | null;

function isTransientSignUpError(error: AuthRequestError): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (typeof error.status === "number" && error.status >= 500) || /502|bad gateway|gateway timeout|network request failed|failed to fetch|fetch failed|timeout/i.test(message);
}

export function shouldRetrySignUp(error: AuthRequestError, attempt: number): boolean {
  return attempt === 0 && isTransientSignUpError(error);
}
