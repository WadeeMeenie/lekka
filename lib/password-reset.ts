export function isRecoverableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getPasswordResetValidationMessage(email: string): string | null {
  if (!email.trim()) return "Enter the email address you use for Lekka.";
  if (!isRecoverableEmail(email)) return "Enter a valid email address, such as you@example.com.";
  return null;
}

export const PASSWORD_RESET_SUCCESS_MESSAGE = "If a Lekka account uses that email address, we’ve sent a secure password-reset link. Check your inbox and spam folder, then return to Lekka to sign in with your new password.";
