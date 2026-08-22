export function getPersonalDetailsSaveMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("row-level security") || normalized.includes("rls") || normalized.includes("42501")) {
    return "We couldn’t save your personal details right now. Please try again in a moment.";
  }
  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("timeout")) {
    return "We couldn’t reach Lekka. Check your connection and try again.";
  }
  return message || "We couldn’t save your personal details. Please try again.";
}
