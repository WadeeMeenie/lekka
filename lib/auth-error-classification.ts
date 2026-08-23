import { AuthError } from "@supabase/supabase-js";

export enum AuthErrorType {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}

export interface ClassifiedAuthError {
  type: AuthErrorType;
  userMessage: string;
  isRetryable: boolean;
}

export function classifyAuthError(error: unknown): ClassifiedAuthError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timed out")) {
      return {
        type: AuthErrorType.REQUEST_TIMEOUT,
        userMessage: "Sign-in is taking longer than expected. Check your connection and try again.",
        isRetryable: true,
      };
    }
    if (msg.includes("network") || msg.includes("offline") || msg.includes("connection")) {
      return {
        type: AuthErrorType.NETWORK_UNAVAILABLE,
        userMessage: "You're offline. Check your internet connection and try again.",
        isRetryable: true,
      };
    }
  }

  if (error instanceof AuthError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login") || msg.includes("user not found")) {
      return {
        type: AuthErrorType.INVALID_CREDENTIALS,
        userMessage: "The email or password you entered is incorrect.",
        isRetryable: false,
      };
    }
    if (msg.includes("rate limit") || error.status === 429) {
      return {
        type: AuthErrorType.RATE_LIMITED,
        userMessage: "Too many login attempts. Please wait and try again.",
        isRetryable: true,
      };
    }
    if (error.status === 503 || error.status === 502 || error.status === 504) {
      return {
        type: AuthErrorType.SERVICE_UNAVAILABLE,
        userMessage: "Lekka's sign-in service is temporarily unavailable. Please try again shortly.",
        isRetryable: true,
      };
    }
  }

  return {
    type: AuthErrorType.UNKNOWN,
    userMessage: "Sign-in failed. Please check your details and try again.",
    isRetryable: true,
  };
}

export function getRetryDelayMs(attemptNumber: number): number {
  const baseDelay = Math.min(500 * Math.pow(2, attemptNumber), 8000);
  const jitter = baseDelay * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}

export function logAuthEvent(event: string, details?: Record<string, unknown>): void {
  console.log(`[AUTH] ${event}`, details);
}
