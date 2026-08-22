import { USERNAME_CHANGE_COOLDOWN_DAYS } from "./username";
import type { UsernameChange } from "./profile-settings";

export function formatAccountDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function getUsernameCooldownStatus(history: UsernameChange[], now = Date.now()) {
  const latest = history[history.length - 1];
  if (!latest) return { locked: false, message: "Username is available to change", nextAvailableAt: null };
  const changedAt = Date.parse(latest.changedAt);
  const nextAvailableAt = new Date(changedAt);
  nextAvailableAt.setDate(nextAvailableAt.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
  const locked = Number.isFinite(changedAt) && nextAvailableAt.getTime() > now;
  return {
    locked,
    message: locked ? "Username changes are locked" : "Username is available to change",
    nextAvailableAt: Number.isFinite(changedAt) ? nextAvailableAt.toISOString() : null,
  };
}

export function mapServerUsernameHistory(rows: Array<{ new_username: string; changed_at: string }>): UsernameChange[] {
  return rows.map((row) => ({ username: row.new_username, changedAt: row.changed_at }));
}
