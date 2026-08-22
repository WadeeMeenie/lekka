import { supabase } from "./supabase";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "api", "help", "lekka", "moderator", "official", "root", "support", "system", "user", "users",
]);

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "");
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!username) return "Choose a username for your public profile.";
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  if (!/^[a-z0-9]/.test(username)) return "Username must start with a letter or number.";
  if (RESERVED_USERNAMES.has(username)) return "That username is reserved. Choose a different handle.";
  return null;
}

export async function checkUsernameAvailability(value: string, currentUserId?: string) {
  const username = normalizeUsername(value);
  const validationError = validateUsername(username);
  if (validationError) return { username, available: false, error: new Error(validationError) };
  if (!supabase) return { username, available: false, error: new Error("Backend is not configured") };
  let query = supabase.from("profiles").select("id").eq("username", username).limit(1);
  if (currentUserId) query = query.neq("id", currentUserId);
  const { data, error } = await query.maybeSingle();
  if (error) return { username, available: false, error };
  return { username, available: !data, error: null };
}

export function getUsernameSuggestions(value: string): string[] {
  const base = normalizeUsername(value).replace(/[._-]+$/g, "").slice(0, USERNAME_MAX_LENGTH - 4);
  if (!base) return [];
  return Array.from(new Set([
    `${base}1`,
    `${base}24`,
    `${base}_local`,
    `${base}.sa`,
  ])).filter((candidate) => candidate !== normalizeUsername(value)).slice(0, 4);
}

export async function findAvailableUsernameSuggestions(value: string, currentUserId?: string) {
  const candidates = getUsernameSuggestions(value);
  const available: string[] = [];
  for (const candidate of candidates) {
    const result = await checkUsernameAvailability(candidate, currentUserId);
    if (!result.error && result.available) available.push(candidate);
    if (available.length === 3) break;
  }
  return available;
}

export async function loadServerUsernameHistory(userId: string, offset = 0, pageSize = 20) {
  if (!supabase) return { data: [], error: new Error("Backend is not configured"), hasMore: false };
  const { data, error } = await supabase
    .from("username_changes")
    .select("old_username,new_username,changed_at")
    .eq("user_id", userId)
    .order("changed_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  const rows = data ?? [];
  return { data: rows, error, hasMore: rows.length === pageSize };
}

export async function recordServerUsernameChange(userId: string, oldUsername: string | null, newUsername: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { error } = await supabase.from("username_changes").insert({
    user_id: userId,
    old_username: oldUsername ? normalizeUsername(oldUsername) : null,
    new_username: normalizeUsername(newUsername),
  });
  return { error };
}

export async function trackUsernameEvent(userId: string, eventType: "unavailable" | "suggestion_selected") {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { error } = await supabase.from("username_events").insert({ user_id: userId, event_type: eventType });
  return { error };
}
