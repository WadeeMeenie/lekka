import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";

type DiscoveryDetail = {
  id: string;
  title: string;
  description: string;
  category?: string;
  area: string;
  start_time?: string | null;
  end_time?: string | null;
  business_id?: string | null;
};

export default function DiscoveryDetailScreen() {
  const colors = useColors();
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const [detail, setDetail] = useState<DiscoveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    void (async () => {
      if (!id || (type !== "event" && type !== "deal")) {
        setError("This local listing link is invalid.");
        return;
      }
      if (!supabase) {
        setError("Local details are unavailable because Lekka is not connected to its service.");
        return;
      }
      const result = type === "event"
        ? await supabase.from("events").select("id,title,description,category,area,start_time,end_time,business_id").eq("id", id).maybeSingle()
        : await supabase.from("deals").select("id,title,description,area,start_time,end_time,business_id").eq("id", id).maybeSingle();
      if (!active) return;
      if (result.error) setError("We couldn’t load this listing. Check your connection and try again.");
      else if (!result.data) setError("This " + type + " is no longer available.");
      else setDetail(result.data as unknown as DiscoveryDetail);
    })().catch(() => {
      if (active) setError("We couldn’t load this listing. Check your connection and try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [type, id, retryKey]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/nearby" as never);
  };

  const starts = formatLocalDate(detail?.start_time);
  const ends = formatLocalDate(detail?.end_time);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back to local discovery" onPress={goBack} style={styles.back}>
        <IconSymbol name="chevron.right" size={21} color={colors.foreground} style={styles.backIcon} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Explore</Text>
      </Pressable>
      {loading ? <View accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.body, { color: colors.muted }]}>Loading {type} details…</Text></View>
        : error ? <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={26} color={colors.error} />
          <Text accessibilityRole="alert" style={[styles.statusTitle, { color: colors.foreground }]}>{error}</Text>
          {error.includes("try again") ? <Pressable accessibilityRole="button" accessibilityLabel="Retry loading listing details" onPress={() => setRetryKey((current) => current + 1)} style={[styles.retry, { borderColor: colors.border }]}><Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text></Pressable> : null}
        </View>
        : detail ? <>
          <View style={[styles.typePill, { backgroundColor: colors.primary + "18" }]}><IconSymbol name={type === "event" ? "calendar" : "tag.fill"} size={16} color={colors.primary} /><Text style={[styles.typeText, { color: colors.primary }]}>{type === "event" ? "Local event" : "Local deal"}</Text></View>
          <Text style={[styles.title, { color: colors.foreground }]}>{detail.title}</Text>
          {detail.category ? <Text style={[styles.category, { color: colors.muted }]}>{detail.category}</Text> : null}
          <View style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.metaRow}><IconSymbol name="location.fill" size={18} color={colors.primary} /><View style={styles.metaCopy}><Text style={[styles.metaLabel, { color: colors.muted }]}>AREA</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>{detail.area}</Text></View></View>
            {starts ? <View style={styles.metaRow}><IconSymbol name="clock.fill" size={18} color={colors.primary} /><View style={styles.metaCopy}><Text style={[styles.metaLabel, { color: colors.muted }]}>{type === "event" ? "STARTS" : "AVAILABLE FROM"}</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>{starts}</Text></View></View> : null}
            {ends ? <View style={styles.metaRow}><IconSymbol name="calendar" size={18} color={colors.primary} /><View style={styles.metaCopy}><Text style={[styles.metaLabel, { color: colors.muted }]}>{type === "event" ? "ENDS" : "OFFER ENDS"}</Text><Text style={[styles.metaValue, { color: colors.foreground }]}>{ends}</Text></View></View> : null}
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this {type}</Text>
          <Text style={[styles.description, { color: colors.foreground }]}>{detail.description?.trim() || "The organiser has not added a description yet."}</Text>
          {detail.business_id ? <Pressable accessibilityRole="button" accessibilityLabel="View the associated business" onPress={() => router.push({ pathname: "/local/[id]", params: { id: detail.business_id! } } as never)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}><Text style={[styles.primaryText, { color: colors.background }]}>View business</Text><IconSymbol name="arrow.right" size={17} color={colors.background} /></Pressable> : null}
        </> : null}
    </ScrollView>
  </ScreenContainer>;
}

function formatLocalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 13, fontWeight: "800" },
  center: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 },
  body: { fontSize: 13, lineHeight: 19 },
  statusCard: { borderWidth: 1, borderRadius: 18, padding: 22, alignItems: "center", gap: 10 },
  statusTitle: { fontSize: 14, lineHeight: 20, textAlign: "center", fontWeight: "700" },
  retry: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  retryText: { fontSize: 13, fontWeight: "800" },
  typePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  typeText: { fontSize: 12, fontWeight: "800" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 16 },
  category: { fontSize: 13, marginTop: 5 },
  metaCard: { borderWidth: 1, borderRadius: 17, padding: 15, gap: 15, marginTop: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  metaCopy: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  metaValue: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginTop: 26, marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 23 },
  primary: { minHeight: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, marginTop: 24 },
  primaryText: { fontSize: 14, fontWeight: "900" },
});
