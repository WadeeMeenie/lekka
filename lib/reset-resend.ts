export const RESET_RESEND_COOLDOWN_SECONDS = 60;

export function getResendEmailLabel(secondsRemaining: number): string {
  return secondsRemaining > 0 ? `Resend email in ${Math.ceil(secondsRemaining)}s` : "Resend email";
}
