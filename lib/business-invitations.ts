import * as Linking from "expo-linking";
import * as MailComposer from "expo-mail-composer";

import { supabase } from "@/lib/supabase";
import { type BusinessInviteRole, validateBusinessInvite } from "@/lib/business-invitation-validation";

export type { BusinessInviteRole } from "@/lib/business-invitation-validation";

export function createBusinessInvitationLink(token: string) {
  return Linking.createURL("business-invite", { queryParams: { token } });
}

export async function createBusinessInvitation(businessId: string, email: string, role: BusinessInviteRole) {
  const validated = validateBusinessInvite(email, role);
  if (!validated.data) return { data: null, error: new Error(validated.error) };
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.rpc("create_business_invitation", { p_business_id: businessId, p_email: validated.data.email, p_role: validated.data.role });
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row as { id: string; token: string; expires_at: string; business_name: string } | null, error };
}

export async function acceptBusinessInvitation(token: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.rpc("accept_business_invitation", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row as { business_id: string; business_name: string; role: BusinessInviteRole } | null, error };
}

export async function composeBusinessInvitationEmail(email: string, businessName: string, role: BusinessInviteRole, token: string) {
  const link = createBusinessInvitationLink(token);
  if (!(await MailComposer.isAvailableAsync())) return { status: "unavailable" as const, link };
  const result = await MailComposer.composeAsync({ recipients: [email], subject: `Join ${businessName} on Lekka`, body: `You have been invited to join ${businessName} as ${role}.\n\nOpen this secure Lekka invitation link:\n${link}\n\nThe invitation expires in 14 days. Sign in or create your Lekka account with this email address to accept it.` });
  return { status: result.status, link };
}
