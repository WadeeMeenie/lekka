import { classifyAuthError, getRetryDelayMs, AuthErrorType, logAuthEvent } from "@/lib/auth-error-classification";
import { checkNetworkConnection } from "@/lib/network";

/**
 * Retry an async operation with exponential backoff.
 * Automatically detects retryable errors and handles network availability.
 *
 * @param operation - Async function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param onAttempt - Optional callback before each attempt
 * @returns Result on success, throws error on final failure
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  {
    maxAttempts = 3,
    onAttempt,
  }: {
    maxAttempts?: number;
    onAttempt?: (attemptNumber: number, error?: unknown) => void;
  } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      onAttempt?.(attempt);
      const result = await operation();
      if (attempt > 0) {
        logAuthEvent("RETRY_SUCCESS", { attempt, maxAttempts });
      }
      return result;
    } catch (error) {
      lastError = error;

      const classified = classifyAuthError(error);

      // Don't retry non-retryable errors (e.g., invalid credentials)
      if (!classified.isRetryable) {
        logAuthEvent("AUTH_FAILED_NO_RETRY", {
          errorType: classified.type,
          attempt,
          isDeveloperError: classified.isDeveloperError,
        });
        throw error;
      }

      // If this is the last attempt, throw
      if (attempt === maxAttempts - 1) {
        logAuthEvent("AUTH_FAILED_MAX_ATTEMPTS", {
          errorType: classified.type,
          maxAttempts,
          isDeveloperError: classified.isDeveloperError,
        });
        throw error;
      }

      // For network errors, check if network is actually available
      if (classified.type === AuthErrorType.NETWORK_UNAVAILABLE) {
        const isOnline = await checkNetworkConnection();
        if (!isOnline) {
          logAuthEvent("AUTH_NETWORK_OFFLINE", { attempt });
          // Still retryable in case network comes back
        }
      }

      // Wait before retrying
      const delayMs = getRetryDelayMs(attempt);
      logAuthEvent("AUTH_RETRY", {
        attempt: attempt + 1,
        maxAttempts,
        delayMs,
        errorType: classified.type,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
