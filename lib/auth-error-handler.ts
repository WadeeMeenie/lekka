import { AuthError } from "@supabase/supabase-js";

export enum AuthErrorType {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
  AUTH_INIT_ERROR = "AUTH_INIT_ERROR",
}

interface ClassifiedError {
  type: AuthErrorType;
  userMessage: string;
  isRetryable: boolean;
  shouldLogDetails: boolean;
}

export function classifyAuthError(error: unknown): ClassifiedError {
  // Handle timeout errors
  if (error instanceof Error && error.message.toLowerCase().includes("timed out")) {
    return {
      type: AuthErrorType.REQUEST_TIMEOUT,
      userMessage: "Sign-in is taking longer than expected. Please check your connection and try again.",
      isRetryable: true,
      shouldLogDetails: true,
    };
  }

  // Handle Supabase AuthError
  if (error instanceof AuthError) {
    // Invalid credentials
    if (
      error.message.toLowerCase().includes("invalid login credentials") ||
      error.message.toLowerCase().includes("user not found") ||
      error.status === 400
    ) {
      return {
        type: AuthErrorType.INVALID_CREDENTIALS,
        userMessage: "The email or password you entered is incorrect. Please try again.",
        isRetryable: false,
        shouldLogDetails: false,
      };
    }

    // Rate limiting
    if (error.message.toLowerCase().includes("rate limit") || error.status === 429) {
      return {
        type: AuthErrorType.RATE_LIMITED,
        userMessage: "Too many login attempts. Please wait a few minutes and try again.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }

    // Service unavailable
    if (error.status === 503 || error.message.toLowerCase().includes("service unavailable")) {
      return {
        type: AuthErrorType.SERVICE_UNAVAILABLE,
        userMessage: "Lekka's sign-in service is temporarily unavailable. Please try again shortly.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }

    // Bad gateway / upstream errors
    if (error.status === 502 || error.status === 504 || error.message.toLowerCase().includes("gateway")) {
      return {
        type: AuthErrorType.SERVICE_UNAVAILABLE,
        userMessage: "Lekka's sign-in service is temporarily unavailable. Please try again shortly.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }

    // Server error
    if (error.status && error.status >= 500) {
      return {
        type: AuthErrorType.SERVER_ERROR,
        userMessage: "A server error occurred. Please try again shortly.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }
  }

  // Handle network-like error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("offline") || message.includes("connection")) {
      return {
        type: AuthErrorType.NETWORK_UNAVAILABLE,
        userMessage: "You're offline. Check your internet connection and try again.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }

    if (message.includes("fetch") || message.includes("request failed")) {
      return {
        type: AuthErrorType.NETWORK_UNAVAILABLE,
        userMessage: "You're offline. Check your internet connection and try again.",
        isRetryable: true,
        shouldLogDetails: true,
      };
    }
  }

  // Default: unknown error
  return {
    type: AuthErrorType.UNKNOWN,
    userMessage: "Sign-in failed. Please check your details and try again.",
    isRetryable: true,
    shouldLogDetails: true,
  };
}

export function shouldRetry(error: unknown): boolean {
  const classified = classifyAuthError(error);
  return classified.isRetryable;
}

export function getRetryDelayMs(attemptNumber: number): number {
  // Exponential backoff: 1s, 2s, 4s (cap at 8s)
  const delay = Math.min(1000 * Math.pow(2, attemptNumber), 8000);
  // Add jitter: ±10%
  const jitter = delay * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}

/**
 * Log auth event safely in development/debug builds.
 * Never log credentials or tokens.
 */
export function logAuthEvent(
  event: string,
  details?: Record<string, unknown>,
  shouldLog = true,
): void {
  if (!shouldLog) return;

  // In production, only log to safe debugging infrastructure.
  // For now, use console in development.
  const safe = details
    ? Object.entries(details).reduce(
        (acc, [key, value]) => {
          // Redact sensitive fields
          if (key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) {
            acc[key] = "[REDACTED]";
          } else if (typeof value === "string" && value.includes("@")) {
            // Partial email redaction: show only domain
            acc[key] = value.replace(/(.+)@(.+)/, "***@$2");
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>,
      )
    : undefined;

  console.log(`[AUTH] ${event}`, safe ? JSON.stringify(safe) : "");
}
