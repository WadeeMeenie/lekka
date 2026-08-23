import { classifyAuthError, getRetryDelayMs, AuthErrorType, logAuthEvent } from "@/lib/auth-error-classification";
import { checkNetworkConnection } from "@/lib/network";

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  { maxAttempts = 3 }: { maxAttempts?: number } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        logAuthEvent("AUTH_RETRY_ATTEMPT", { attempt });
      }
      return await operation();
    } catch (error) {
      lastError = error;
      const classified = classifyAuthError(error);

      if (!classified.isRetryable || attempt === maxAttempts - 1) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt);
      logAuthEvent("AUTH_WILL_RETRY", { attempt: attempt + 1, delayMs, errorType: classified.type });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
