export function isBadGatewayError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /502|bad gateway|gateway timeout|upstream/i.test(message);
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (isBadGatewayError(error)) {
    return "Lekka could not reach the secure sign-up service right now. Your details were not lost. Check your connection and try again in a moment.";
  }
  const message = error instanceof Error ? error.message.trim() : String(error ?? "").trim();
  return message || fallback;
}

export const LEKKA_CONFIRMATION_MESSAGE =
  "Your Lekka account is almost ready. Check your inbox for the Lekka confirmation email, tap Confirm email address, then return here to sign in. If the confirmation page shows a temporary 502 error, wait a moment and open the email link again.";

export const LEKKA_PROVIDER_SETUP_MESSAGE =
  "This sign-in option is not enabled for Lekka yet. Please use email sign-in while the provider setup is completed.";

export function getPasswordToggleLabel(visible: boolean): string {
  return visible ? "Hide password" : "Show password";
}

export function getPasswordToggleIcon(visible: boolean): "visibility" | "visibility-off" {
  return visible ? "visibility" : "visibility-off";
}

export function getConfirmationEmailSubject(): string {
  return "Confirm your Lekka email address";
}

export function getConfirmationEmailIntro(): string {
  return "Welcome to Lekka — confirm your email address to join your local network.";
}

export function getConfirmationEmailBody(): string {
  return "Tap the button below to confirm your email and finish creating your Lekka account. If you did not create a Lekka account, you can safely ignore this email.";
}

export function getConfirmationEmailFooter(): string {
  return "Lekka · Real people, real places, and what matters around you.";
}
