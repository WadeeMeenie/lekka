import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listMyConversations, listConversationMessages, markConversationRead, respondToMessageRequest, sendDirectMessage, subscribeToConversation, type Conversation, type DirectMessage } from "@/lib/messaging";

export default function MessagesScreen() {
  const colors = useColors();
  const { isAuthenticated } = useSupabaseAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");

  const loadConversations = async () => {
    const result = await listMyConversations();
    if (!result.error) {
      setConversations(result.data);
      if (conversationId) setSelected(result.data.find((conversation) => conversation.id === conversationId) ?? null);
    }
  };
  useEffect(() => { if (isAuthenticated) void loadConversations(); }, [isAuthenticated, conversationId]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const load = async () => {
      const result = await listConversationMessages(selected.id);
      if (active && !result.error) setMessages(result.data);
      if (selected.request_status === "accepted") await markConversationRead(selected.id);
    };
    void load();
    const stop = subscribeToConversation(selected.id, () => { void load(); void loadConversations(); });
    return () => { active = false; stop(); };
  }, [selected?.id, selected?.request_status]);

  if (!isAuthenticated) return <ScreenContainer><View style={styles.center}><Text style={[styles.title, { color: colors.foreground }]}>Sign in to use messages</Text></View></ScreenContainer>;

  if (selected) {
    const isPendingRecipient = selected.request_status === "pending" && selected.requested_by !== selected.other_profile?.id;
    return <ScreenContainer>
      <View style={styles.header}><Pressable onPress={() => setSelected(null)}><IconSymbol name="chevron.left" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>{selected.other_profile?.display_name ?? "Conversation"}</Text><View style={{ width: 22 }} /></View>
      {selected.request_status === "pending" ? <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.requestTitle, { color: colors.foreground }]}>{isPendingRecipient ? "New message request" : "Message request sent"}</Text><Text style={[styles.body, { color: colors.muted }]}>{isPendingRecipient ? "You can accept this conversation before the sender can send another message." : "The recipient must accept this conversation before you can send another message."}</Text>{isPendingRecipient && <View style={styles.requestActions}><Pressable onPress={async () => { const result = await respondToMessageRequest(selected.id, "accepted"); if (result.error) Alert.alert("Couldn't accept", result.error.message); else { setSelected({ ...selected, request_status: "accepted" }); void loadConversations(); } }} style={[styles.accept, { backgroundColor: colors.primary }]}><Text style={styles.acceptText}>Accept</Text></Pressable><Pressable onPress={async () => { const result = await respondToMessageRequest(selected.id, "rejected"); if (result.error) Alert.alert("Couldn't decline", result.error.message); else { setSelected({ ...selected, request_status: "rejected" }); void loadConversations(); } }} style={[styles.decline, { borderColor: colors.border }]}><Text style={[styles.declineText, { color: colors.muted }]}>Decline</Text></Pressable></View>}</View> : null}
      <ScrollView contentContainerStyle={styles.thread}>{messages.map((message) => <View key={message.id} style={[styles.bubble, { alignSelf: message.sender_id === selected.other_profile?.id ? "flex-start" : "flex-end", backgroundColor: message.sender_id === selected.other_profile?.id ? colors.surface : colors.primary, borderColor: colors.border }]}><Text style={{ color: message.sender_id === selected.other_profile?.id ? colors.foreground : "#10211D" }}>{message.body}</Text></View>)}</ScrollView>
      {selected.request_status === "accepted" || selected.requested_by !== selected.other_profile?.id ? <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}><TextInput value={text} onChangeText={setText} editable={selected.request_status !== "rejected"} placeholder={selected.request_status === "rejected" ? "Conversation declined" : "Write a message…"} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} /><Pressable disabled={selected.request_status === "rejected"} onPress={async () => { const result = await sendDirectMessage(selected.id, text); if (!result.error && result.data) { setText(""); setMessages((current) => [...current, result.data!]); } else if (result.error) Alert.alert("Couldn't send", result.error.message); }}><IconSymbol name="arrow.up.circle.fill" size={30} color={colors.primary} /></Pressable></View> : null}
    </ScreenContainer>;
  }

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Pressable onPress={() => router.back()}><IconSymbol name="chevron.left" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text><Pressable onPress={() => router.push("/buddies" as never)}><IconSymbol name="person.2.fill" size={21} color={colors.foreground} /></Pressable></View>{conversations.length === 0 ? <View style={styles.center}><IconSymbol name="message.fill" size={32} color={colors.muted} /><Text style={[styles.title, { color: colors.foreground }]}>No messages yet</Text><Text style={[styles.body, { color: colors.muted }]}>Open Buddies to choose someone to message. New message requests will appear here.</Text><Pressable onPress={() => router.push("/buddies" as never)} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Choose a Buddy</Text></Pressable></View> : conversations.map((conversation) => <Pressable key={conversation.id} onPress={() => setSelected(conversation)} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{conversation.other_profile?.display_name?.slice(0, 1).toUpperCase() ?? "?"}</Text></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.foreground }]}>{conversation.other_profile?.display_name ?? "Lekka user"}</Text><Text style={[styles.bodyLeft, { color: colors.muted }]}>{conversation.request_status === "pending" ? (conversation.requested_by === conversation.other_profile?.id ? "New message request" : "Awaiting acceptance") : conversation.request_status === "rejected" ? "Declined" : conversation.other_profile?.username ? `@${conversation.other_profile.username}` : "Private conversation"}</Text></View><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }, headerTitle: { fontSize: 18, fontWeight: "900" }, row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 17, padding: 13, marginTop: 9 }, avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontWeight: "900" }, name: { fontSize: 14, fontWeight: "800" }, bodyLeft: { fontSize: 12, marginTop: 4 }, body: { fontSize: 12, lineHeight: 18, marginTop: 4 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, title: { fontSize: 19, fontWeight: "900", marginTop: 10 }, thread: { padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }, bubble: { maxWidth: "78%", borderWidth: 1, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10 }, composer: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 18, padding: 7, margin: 10 }, input: { flex: 1, minHeight: 42, paddingHorizontal: 10 }, requestCard: { borderWidth: 1, borderRadius: 17, padding: 14, margin: 10 }, requestTitle: { fontSize: 15, fontWeight: "900" }, requestActions: { flexDirection: "row", gap: 8, marginTop: 12 }, accept: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }, acceptText: { color: "#10211D", fontWeight: "900" }, decline: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 }, declineText: { fontWeight: "800" }, primary: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, marginTop: 10 }, primaryText: { color: "#10211D", fontWeight: "900" }
});
