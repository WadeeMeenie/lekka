export type AsyncErrorKind = "offline" | "timeout" | "auth" | "validation" | "server" | "unknown";

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "";
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || !error) return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}

export function classifyAsyncError(error: unknown): AsyncErrorKind {
  const message = messageOf(error).toLowerCase();
  const status = statusOf(error);
  if (message.includes("timeout") || message.includes("timed out")) return "timeout";
  if (message.includes("network") || message.includes("offline") || message.includes("fetch failed") || message.includes("failed to fetch")) return "offline";
  if (status === 401 || status === 403 || message.includes("not authenticated") || message.includes("unauthorized") || message.includes("jwt")) return "auth";
  if (status === 400 || status === 422 || message.includes("invalid") || message.includes("required") || message.includes("already exists")) return "validation";
  if (status !== undefined && status >= 500) return "server";
  return "unknown";
}

export function asyncErrorMessage(error: unknown, fallback = "We couldn’t complete that request. Please try again."): string {
  switch (classifyAsyncError(error)) {
    case "offline": return "You appear to be offline. Your data is unchanged. Reconnect and try again.";
    case "timeout": return "The request took too long. Your data is unchanged. Check your connection and try again.";
    case "auth": return "Your session is no longer active. Sign in again and retry.";
    case "validation": return "Please check the information you entered and try again.";
    case "server": return "Lekka’s service is temporarily unavailable. Your data is unchanged. Try again shortly.";
    default: return fallback;
  }
}

export function isRetryableAsyncError(error: unknown): boolean {
  const kind = classifyAsyncError(error);
  return kind === "offline" || kind === "timeout" || kind === "server" || kind === "unknown";
}
