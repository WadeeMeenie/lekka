import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/lib/supabase";

export default function EditPostScreen() {
  const colors = useColors();
  const { user } = useSupabaseAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase || !user || !id) return;
      const { data, error } = await supabase.from("posts").select("title,body,author_id").eq("id", id).maybeSingle();
      if (!active) return;
      if (error || !data || data.author_id !== user.id) {
        Alert.alert("Couldn't load post", error?.message || "You can only edit your own posts.");
        router.back();
        return;
      }
      setTitle(data.title ?? "");
      setBody(data.body ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, user?.id]);

  const save = async () => {
    if (!supabase || !user || !id || !body.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("posts").update({
      title: title.trim() || null,
      body: body.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("author_id", user.id);
    setSaving(false);
    if (error) {
      Alert.alert("Couldn't save changes", error.message);
      return;
    }
    router.back();
  };

  if (loading) return <ScreenContainer><View style={styles.center}><Text style={{ color: colors.muted }}>Loading post…</Text></View></ScreenContainer>;

  return <ScreenContainer>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.foreground }]}>Edit post</Text>
      <Text style={[styles.label, { color: colors.muted }]}>TITLE</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
      <Text style={[styles.label, { color: colors.muted }]}>POST</Text>
      <TextInput multiline value={body} onChangeText={setBody} placeholder="What's happening?" placeholderTextColor={colors.muted} textAlignVertical="top" style={[styles.body, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
      <Pressable disabled={saving || !body.trim()} onPress={() => void save()} style={[styles.button, { backgroundColor: colors.primary, opacity: saving || !body.trim() ? 0.5 : 1 }]}>
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save changes"}</Text>
      </Pressable>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 12 },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15 },
  body: { borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 180, fontSize: 15, lineHeight: 22 },
  button: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 14 },
  buttonText: { color: "#10211D", fontSize: 15, fontWeight: "900" },
});
