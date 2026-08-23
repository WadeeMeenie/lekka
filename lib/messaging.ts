import { supabase } from "@/lib/supabase";

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  updated_at: string;
  request_status: "pending" | "accepted" | "rejected";
  requested_by: string | null;
  other_profile: { id: string; display_name: string; username: string | null; profile_image_path: string | null } | null;
  last_message: { body: string; created_at: string; sender_id: string } | null;
};
export type DirectMessage = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export async function getOrCreateConversation(otherUserId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { other_user: otherUserId });
  return { data: data as string | null, error };
}

export async function listMyConversations() {
  if (!supabase) return { data: [] as Conversation[], error: new Error("Backend is not configured") };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: [], error: new Error("Please sign in") };
  const result = await supabase.from("direct_conversations")
    .select("id, user_a, user_b, updated_at, request_status, requested_by, user_a_profile:profiles!direct_conversations_user_a_fkey(id, display_name, username, profile_image_path), user_b_profile:profiles!direct_conversations_user_b_fkey(id, display_name, username, profile_image_path)")
    .or(`user_a.eq.${auth.user.id},user_b.eq.${auth.user.id}`)
    .order("updated_at", { ascending: false });
  if (result.error) return { data: [] as Conversation[], error: result.error };
  const conversations = (result.data ?? []).map((row: any) => ({ ...row, other_profile: row.user_a === auth.user!.id ? row.user_b_profile : row.user_a_profile, last_message: null })) as Conversation[];
  return { data: conversations, error: null };
}

export async function listConversationMessages(conversationId: string) {
  if (!supabase) return { data: [] as DirectMessage[], error: new Error("Backend is not configured") };
  const result = await supabase.from("direct_messages").select("id, conversation_id, sender_id, body, created_at, read_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
  return { data: (result.data ?? []) as DirectMessage[], error: result.error };
}

export async function sendDirectMessage(conversationId: string, body: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error("Please sign in") };
  const text = body.trim();
  if (!text) return { data: null, error: new Error("Message cannot be empty") };
  const conversation = await supabase.from("direct_conversations").select("request_status, requested_by").eq("id", conversationId).maybeSingle();
  if (conversation.error) return { data: null, error: conversation.error };
  if (!conversation.data) return { data: null, error: new Error("Conversation not found") };
  if (conversation.data.request_status === "rejected") return { data: null, error: new Error("This conversation was declined") };
  if (conversation.data.request_status !== "accepted") return { data: null, error: new Error("Wait for the recipient to accept the message request before sending another message") };
  const result = await supabase.from("direct_messages").insert({ conversation_id: conversationId, sender_id: auth.user.id, body: text }).select("id, conversation_id, sender_id, body, created_at, read_at").single();
  if (!result.error) await supabase.from("direct_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return { data: result.data as DirectMessage | null, error: result.error };
}

export async function respondToMessageRequest(conversationId: string, status: "accepted" | "rejected") {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const result = await supabase.from("direct_conversations").update({ request_status: status, updated_at: new Date().toISOString() }).eq("id", conversationId).eq("request_status", "pending");
  return { error: result.error };
}

export async function markConversationRead(conversationId: string) {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Please sign in") };
  const result = await supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversationId).neq("sender_id", auth.user.id).is("read_at", null);
  return { error: result.error };
}

export function subscribeToConversation(conversationId: string, onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel(`direct-messages-${conversationId}`).on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, onChange).subscribe();
  return () => { void supabase?.removeChannel(channel); };
}
