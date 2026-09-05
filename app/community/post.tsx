import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/lib/supabase";

export default function CommunityPostScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useSupabaseAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!isAuthenticated || !user || !id) return Alert.alert("Sign in required", "Please sign in to post in a community.");
    if (!body.trim()) return Alert.alert("Add something", "Write a message before posting.");
    const client = supabase;
    if (!client) return Alert.alert("Backend unavailable", "Lekka cannot connect to its backend right now.");
    setBusy(true);
    try {
      const { error } = await client.rpc("create_community_post", {
        p_community_id: id,
        p_author_id: user.id,
        p_body: body.trim(),
        p_title: title.trim() || null,
      });
      if (error) return Alert.alert("Couldn't publish", error.message);
      router.replace({ pathname: "/community/[id]", params: { id } } as never);
    } finally {
      setBusy(false);
    }
  };

  return <ScreenContainer><View style={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="Cancel community post" accessibilityHint="Returns without publishing this post" onPress={() => router.back()} style={styles.backButton}><Text style={[styles.back, { color: colors.primary }]}>Cancel</Text></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Post to community</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Only members who can access this community will see the post.</Text><TextInput accessibilityLabel="Post title, optional" value={title} onChangeText={setTitle} placeholder="Title (optional)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><TextInput accessibilityLabel="Community post message" value={body} onChangeText={setBody} placeholder="What's happening in the community?" placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={[styles.bodyInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /><Pressable accessibilityRole="button" accessibilityLabel={busy ? "Publishing community post" : "Publish community post"} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void publish()} style={[styles.publish, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}><Text style={styles.publishText}>{busy ? "Publishing…" : "Publish"}</Text></Pressable></View></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { padding: 20 }, backButton: { minHeight: 44, minWidth: 64, justifyContent: "center", alignSelf: "flex-start", marginBottom: 24 }, back: { fontSize: 14, fontWeight: "800" }, title: { fontSize: 29, fontWeight: "900" }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 20 }, input: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, minHeight: 50, marginBottom: 10 }, bodyInput: { borderWidth: 1, borderRadius: 15, padding: 14, minHeight: 180 }, publish: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 14 }, publishText: { color: "#10211D", fontSize: 15, fontWeight: "900" } });
