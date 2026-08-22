import { supabase } from "./supabase";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "");
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!username) return "Choose a username for your public profile.";
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  if (!/^[a-z0-9]/.test(username)) return "Username must start with a letter or number.";
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
