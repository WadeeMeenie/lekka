export const PASSWORD_RULES = [
  { id: "length", label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { id: "uppercase", label: "At least one uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "At least one lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "At least one number", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "At least one special character", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
  { id: "noWhitespace", label: "No spaces", test: (value: string) => !/\s/.test(value) },
] as const;

export function getPasswordRuleResults(value: string) {
  return PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, valid: rule.test(value) }));
}

export type PasswordStrength = { score: number; label: "" | "Weak" | "Fair" | "Good" | "Strong" };

export function getPasswordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: "" };
  const score = getPasswordRuleResults(value).filter((rule) => rule.valid).length;
  if (score <= 2) return { score, label: "Weak" };
  if (score === 3) return { score, label: "Fair" };
  if (score <= 5) return { score, label: "Good" };
  return { score, label: "Strong" };
}

export function isStrongPassword(value: string): boolean {
  return getPasswordStrength(value).score === PASSWORD_RULES.length;
}

export function getPasswordValidationMessage(value: string): string | null {
  const failed = getPasswordRuleResults(value).filter((rule) => !rule.valid).map((rule) => rule.label.toLowerCase());
  return failed.length ? `Password requirements not met: ${failed.join(", ")}.` : null;
}
