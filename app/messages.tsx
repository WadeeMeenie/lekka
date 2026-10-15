import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listMyConversations, listConversationMessages, markConversationRead, respondToMessageRequest, sendDirectMessage, subscribeToConversation, type Conversation, type DirectMessage } from "@/lib/messaging";
import { createSignedMediaUrl } from "@/lib/social-repository";

export default function MessagesScreen() {
  const colors = useColors();
  const { isAuthenticated, user } = useSupabaseAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationAvatarUrls, setConversationAvatarUrls] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadConversations = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listMyConversations();
      if (result.error) { setLoadError(result.error.message || "We couldn't load your messages. Please try again."); return; }
      setConversations(result.data);
      if (conversationId) setSelected(result.data.find((conversation) => conversation.id === conversationId) ?? null);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "We couldn't load your messages. Please try again."); }
    finally { setLoading(false); }
  };

  useEffect(() => { setConversations([]); setConversationAvatarUrls({}); setSelected(null); setMessages([]); setText(""); setLoadError(null); if (isAuthenticated) void loadConversations(); else setLoading(false); }, [isAuthenticated, user?.id, conversationId]);

  useEffect(() => {
    let active = true;
    void Promise.all(conversations.map(async (conversation) => {
      const path = conversation.other_profile?.profile_image_path;
      if (!path) return null;
      const result = await createSignedMediaUrl(path);
      return result.data?.signedUrl ? [conversation.id, result.data.signedUrl] as const : null;
    })).then((pairs) => {
      if (active) setConversationAvatarUrls(Object.fromEntries(pairs.filter(Boolean) as Array<readonly [string, string]>));
    }).catch(() => { if (active) setConversationAvatarUrls({}); });
    return () => { active = false; };
  }, [conversations]);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    setMessages([]);
    let active = true;
    const load = async () => {
      try {
        const result = await listConversationMessages(selected.id);
        if (active && result.error) Alert.alert("Couldn't load conversation", result.error.message || "Please try again.");
        if (active && !result.error) setMessages(result.data);
        if (selected.request_status === "accepted") await markConversationRead(selected.id);
      } catch (error) { if (active) Alert.alert("Couldn't load conversation", error instanceof Error ? error.message : "Please try again."); }
    };
    void load();
    const stop = subscribeToConversation(selected.id, () => { void load(); void loadConversations(); });
    return () => { active = false; stop(); };
  }, [selected?.id, selected?.request_status]);

  if (!isAuthenticated) return <ScreenContainer><View style={styles.center}><Text style={[styles.title, { color: colors.foreground }]}>Sign in to use messages</Text><Pressable accessibilityRole="button" onPress={() => router.push("/auth" as never)} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Sign in</Text></Pressable></View></ScreenContainer>;

  if (selected) {
    const isPendingRecipient = selected.request_status === "pending" && selected.requested_by !== user?.id;
    const isPendingSender = selected.request_status === "pending" && selected.requested_by === user?.id;
    const respond = async (status: "accepted" | "rejected") => {
      if (requestBusy) return;
      setRequestBusy(true);
      try {
        const result = await respondToMessageRequest(selected.id, status);
        if (result.error) Alert.alert(status === "accepted" ? "Couldn't accept" : "Couldn't decline", result.error.message || "Please try again.");
        else { setSelected({ ...selected, request_status: status }); await loadConversations(); }
      } catch (error) { Alert.alert("Message request failed", error instanceof Error ? error.message : "Please try again."); }
      finally { setRequestBusy(false); }
    };
    const send = async () => {
      const body = text.trim();
      if (!body || sending) return;
      setSending(true);
      try {
        const result = await sendDirectMessage(selected.id, body);
        if (result.error) Alert.alert("Couldn't send", result.error.message || "Please try again.");
        else if (result.data) { setText(""); setMessages((current) => [...current, result.data!]); }
      } catch (error) { Alert.alert("Couldn't send", error instanceof Error ? error.message : "Please try again."); }
      finally { setSending(false); }
    };
    return <ScreenContainer>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to messages" onPress={() => setSelected(null)} style={styles.headerIconButton}><IconSymbol name="chevron.left" size={22} color={colors.foreground} /></Pressable><View style={styles.threadHeaderCopy}>{conversationAvatarUrls[selected.id] ? <Image source={{ uri: conversationAvatarUrls[selected.id] }} contentFit="cover" style={styles.threadAvatar} accessibilityLabel="Conversation profile photo" /> : <View style={[styles.threadAvatarFallback, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{selected.other_profile?.display_name?.slice(0, 1).toUpperCase() ?? "?"}</Text></View>}<Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>{selected.other_profile?.display_name ?? "Conversation"}</Text></View><View style={{ width: 44 }} /></View>
      {selected.request_status === "pending" ? <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.requestTitle, { color: colors.foreground }]}>{isPendingRecipient ? "New message request" : "Message request sent"}</Text><Text style={[styles.body, { color: colors.muted }]}>{isPendingRecipient ? "You can accept this conversation before the sender can send another message." : "The recipient must accept this conversation before you can send another message."}</Text>{isPendingRecipient && <View style={styles.requestActions}><Pressable accessibilityRole="button" disabled={requestBusy} onPress={() => void respond("accepted")} style={[styles.accept, { backgroundColor: colors.primary, opacity: requestBusy ? 0.55 : 1 }]}><Text style={styles.acceptText}>Accept</Text></Pressable><Pressable accessibilityRole="button" disabled={requestBusy} onPress={() => void respond("rejected")} style={[styles.decline, { borderColor: colors.border, opacity: requestBusy ? 0.55 : 1 }]}><Text style={[styles.declineText, { color: colors.muted }]}>Decline</Text></Pressable></View>}{isPendingSender && <View style={[styles.pendingNote, { backgroundColor: `${colors.primary}12` }]}><Text style={[styles.body, { color: colors.muted }]}>Your first message has been delivered. Wait for the recipient to accept before sending another message.</Text></View>}</View> : null}
      <ScrollView contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">{messages.map((message) => <View key={message.id} style={[styles.bubble, { alignSelf: message.sender_id === selected.other_profile?.id ? "flex-start" : "flex-end", backgroundColor: message.sender_id === selected.other_profile?.id ? colors.surface : colors.primary, borderColor: colors.border }]}><Text style={{ color: message.sender_id === selected.other_profile?.id ? colors.foreground : "#10211D" }}>{message.body}</Text></View>)}</ScrollView>
      {selected.request_status === "accepted" ? <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}><TextInput value={text} onChangeText={setText} editable={!sending} placeholder="Write a message…" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!text.trim() || sending} onPress={() => void send()} style={[styles.sendButton, { opacity: !text.trim() || sending ? 0.45 : 1 }]}><IconSymbol name="arrow.up.circle.fill" size={30} color={colors.primary} /></Pressable></View> : null}
    </ScreenContainer>;
  }

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerIconButton}><IconSymbol name="chevron.left" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text><Pressable accessibilityRole="button" accessibilityLabel="Open buddies" onPress={() => router.push("/buddies" as never)} style={styles.headerIconButton}><IconSymbol name="person.2.fill" size={21} color={colors.foreground} /></Pressable></View>{loadError ? <View style={[styles.errorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.body, { color: colors.foreground }]}>{loadError}</Text><Pressable onPress={() => void loadConversations()} disabled={loading} style={[styles.primary, { backgroundColor: colors.primary, opacity: loading ? 0.55 : 1 }]}><Text style={styles.primaryText}>{loading ? "Retrying…" : "Try again"}</Text></Pressable></View> : null}{loading && conversations.length === 0 ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.body, { color: colors.muted }]}>Loading messages…</Text></View> : conversations.length === 0 && !loadError ? <View style={styles.center}><IconSymbol name="message.fill" size={32} color={colors.muted} /><Text style={[styles.title, { color: colors.foreground }]}>No messages yet</Text><Text style={[styles.body, { color: colors.muted }]}>Open Buddies to choose someone to message. New message requests will appear here.</Text><Pressable onPress={() => router.push("/buddies" as never)} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Choose a Buddy</Text></Pressable></View> : conversations.map((conversation) => <Pressable key={conversation.id} accessibilityRole="button" onPress={() => setSelected(conversation)} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}>{conversationAvatarUrls[conversation.id] ? <Image source={{ uri: conversationAvatarUrls[conversation.id] }} contentFit="cover" style={styles.avatarImage} accessibilityLabel={`${conversation.other_profile?.display_name ?? "Conversation"} profile photo`} /> : <Text style={styles.avatarText}>{conversation.other_profile?.display_name?.slice(0, 1).toUpperCase() ?? "?"}</Text>}</View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.foreground }]}>{conversation.other_profile?.display_name ?? "Lekka user"}</Text><Text style={[styles.bodyLeft, { color: colors.muted }]}>{conversation.request_status === "pending" ? (conversation.requested_by === conversation.other_profile?.id ? "New message request" : "Awaiting acceptance") : conversation.request_status === "rejected" ? "Declined" : conversation.other_profile?.username ? `@${conversation.other_profile.username}` : "Private conversation"}</Text></View><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }, headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, headerTitle: { fontSize: 18, fontWeight: "900" }, row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 17, padding: 13, marginTop: 9, minHeight: 72 }, avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" }, avatarImage: { width: "100%", height: "100%" }, threadHeaderCopy: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0 }, threadAvatar: { width: 34, height: 34, borderRadius: 12 }, threadAvatarFallback: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontWeight: "900" }, name: { fontSize: 14, fontWeight: "800" }, bodyLeft: { fontSize: 12, marginTop: 4 }, body: { fontSize: 12, lineHeight: 18, marginTop: 4 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }, title: { fontSize: 19, fontWeight: "900", marginTop: 10 }, thread: { padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }, bubble: { maxWidth: "78%", borderWidth: 1, borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10 }, composer: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 18, padding: 7, margin: 10 }, input: { flex: 1, minHeight: 42, paddingHorizontal: 10 }, sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, requestCard: { borderWidth: 1, borderRadius: 17, padding: 14, margin: 10 }, requestTitle: { fontSize: 15, fontWeight: "900" }, requestActions: { flexDirection: "row", gap: 8, marginTop: 12 }, accept: { borderRadius: 10, minHeight: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, acceptText: { color: "#10211D", fontWeight: "900" }, decline: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, declineText: { fontWeight: "800" }, pendingNote: { marginTop: 12, padding: 10, borderRadius: 12 }, primary: { borderRadius: 14, minHeight: 44, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginTop: 10 }, primaryText: { color: "#10211D", fontWeight: "900" }, errorCard: { borderWidth: 1, borderRadius: 17, padding: 15, marginTop: 12 }
});
