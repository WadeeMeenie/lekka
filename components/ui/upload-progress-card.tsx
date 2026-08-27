import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getMediaUploadPresentation, type MediaUploadStage } from "@/lib/media-upload-state";

export function UploadProgressCard({ stage, onRetry }: { stage: MediaUploadStage; onRetry?: () => void }) {
  const colors = useColors();
  const presentation = getMediaUploadPresentation(stage);
  const isActive = presentation.tone === "active";
  const [pulseOpacity, setPulseOpacity] = useState(0.55);

  useEffect(() => {
    if (!isActive) {
      setPulseOpacity(1);
      return;
    }

    const interval = setInterval(() => {
      setPulseOpacity((current) => (current === 0.55 ? 1 : 0.55));
    }, 650);

    return () => clearInterval(interval);
  }, [isActive]);

  // Publishing is a transient completion state. Once the post is successfully
  // created, don't leave a stale "Published" card sitting above the composer.
  if (stage === "published") return null;

  const accent = presentation.tone === "error" ? colors.error : presentation.tone === "warning" ? colors.warning : presentation.tone === "success" ? colors.success : colors.primary;

  return (
    <View accessibilityLabel={`${presentation.label}. ${presentation.detail}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: accent, opacity: pulseOpacity }]} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.foreground }]}>{presentation.label}</Text>
          <Text style={[styles.detail, { color: colors.muted }]}>{presentation.detail}</Text>
        </View>
        {onRetry && (
          <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [styles.retry, { borderColor: accent, opacity: pressed ? 0.65 : 1 }]}>
            <Text style={[styles.retryText, { color: accent }]}>Retry</Text>
          </Pressable>
        )}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.progress, { width: `${Math.round(presentation.progress * 100)}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 17, padding: 13, marginTop: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  copy: { flex: 1 },
  label: { fontSize: 13, fontWeight: "900" },
  detail: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  retry: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  retryText: { fontSize: 11, fontWeight: "900" },
  track: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 12 },
  progress: { height: "100%", borderRadius: 3 },
});