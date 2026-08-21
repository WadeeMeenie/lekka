export type BusinessInviteRole = "admin" | "staff";

export function validateBusinessInvite(email: string, role: BusinessInviteRole) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return { data: null, error: "Enter a valid email address." };
  if (role !== "admin" && role !== "staff") return { data: null, error: "Choose an admin or staff role." };
  return { data: { email: normalizedEmail, role }, error: null };
}
