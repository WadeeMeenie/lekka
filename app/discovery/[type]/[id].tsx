import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";

type DetailType = "event" | "deal";
type DiscoveryDetail = {
  id: string;
  title: string;
  description: string;
  area: string;
  category: string | null;
  start_time: string | null;
  end_time: string | null;
  business_id: string | null;
};

export default function DiscoveryDetailScreen() {
  const colors = useColors();
  const { type, id } = useLocalSearchParams<{ type?: string; id?: string }>();
  const [detail, setDetail] = useState<DiscoveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const kind = type?.toLowerCase();

    if (!id || !kind) {
      setError("This discovery item has an invalid link.");
      setLoading(false);
      return () => { active = false; };
    }

    if (kind === "post" || kind === "alert") {
      router.replace({ pathname: "/post/[id]", params: { id } } as never);
      return () => { active = false; };
    }
    if (kind === "business") {
      router.replace({ pathname: "/local/[id]", params: { id } } as never);
      return () => { active = false; };
    }
    if (kind !== "event" && kind !== "deal") {
      setError("This type of discovery item is not supported.");
      setLoading(false);
      return () => { active = false; };
    }

    const detailType = kind as DetailType;
    setLoading(true);
    setError(null);
    setDetail(null);

    void (async () => {
      if (!supabase) throw new Error("Lekka could not connect to its service. Check your connection and try again.");
      const result = detailType === "event"
        ? await supabase.from("events").select("id, title, description, area, category, start_time, end_time, business_id").eq("id", id).maybeSingle()
        : await supabase.from("deals").select("id, title, description, area, start_time, end_time, business_id").eq("id", id).maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) {
        if (active) setError(detailType === "event" ? "This event is unavailable or has been removed." : "This deal is unavailable or has been removed.");
        return;
      }

      const row = result.data as unknown as Record<string, unknown>;
      if (active) {
        setDetail({
          id: String(row.id ?? id),
          title: String(row.title ?? ""),
          description: String(row.description ?? ""),
          area: String(row.area ?? ""),
          category: typeof row.category === "string" ? row.category : null,
          start_time: typeof row.start_time === "string" ? row.start_time : null,
          end_time: typeof row.end_time === "string" ? row.end_time : null,
          business_id: typeof row.business_id === "string" ? row.business_id : null,
        });
      }
    })().catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "We couldn't load this item. Please try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [id, type, attempt]);

  const kind = type?.toLowerCase();
  const isEvent = kind === "event";
  const heading = isEvent ? "Event details" : "Deal details";
  const dateLabel = (value: string | null) => value
    ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back to Explore" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="chevron.right" size={20} color={colors.foreground} style={styles.backIcon} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Explore</Text>
        </Pressable>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.status, { color: colors.muted }]}>Loading {isEvent ? "event" : "deal"}…</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.error} />
            <Text style={[styles.title, { color: colors.foreground }]}>{heading} unavailable</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.primaryText, { color: colors.background }]}>Try again</Text>
            </Pressable>
          </View>
        ) : detail ? (
          <>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
              <IconSymbol name={isEvent ? "calendar" : "tag.fill"} size={30} color={colors.primary} />
            </View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{detail.category || (isEvent ? "Event" : "Deal")}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{detail.title}</Text>
            <View style={styles.metaRow}>
              <IconSymbol name="location.fill" size={17} color={colors.primary} />
              <Text style={[styles.meta, { color: colors.muted }]}>{detail.area || "Area not provided"}</Text>
            </View>
            {detail.start_time ? <InfoRow label={isEvent ? "Starts" : "Offer starts"} value={dateLabel(detail.start_time) || "Not provided"} colors={colors} /> : null}
            {detail.end_time ? <InfoRow label={isEvent ? "Ends" : "Offer ends"} value={dateLabel(detail.end_time) || "Not provided"} colors={colors} /> : null}
            <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this {isEvent ? "event" : "deal"}</Text>
              <Text style={[styles.body, { color: colors.foreground }]}>{detail.description.trim() || "The organiser has not added a description yet."}</Text>
            </View>
            {detail.business_id ? (
              <Pressable accessibilityRole="button" accessibilityLabel="View organiser or business profile" onPress={() => router.push({ pathname: "/local/[id]", params: { id: detail.business_id! } } as never)} style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.secondaryText, { color: colors.foreground }]}>{isEvent ? "View organiser" : "View business"}</Text>
                <IconSymbol name="chevron.right" size={17} color={colors.muted} />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 20 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 14, fontWeight: "700" },
  center: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  status: { fontSize: 14 },
  stateCard: { borderWidth: 1, borderRadius: 18, padding: 22, alignItems: "center", gap: 10 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontSize: 26, lineHeight: 33, fontWeight: "800", marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  meta: { fontSize: 13 },
  infoRow: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 9, gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: "700" },
  infoValue: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  descriptionCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  primaryButton: { minHeight: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 8 },
  primaryText: { fontSize: 14, fontWeight: "700" },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secondaryText: { fontSize: 14, fontWeight: "700" },
});
