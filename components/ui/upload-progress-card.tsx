import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useColors } from "@/hooks/use-colors";
import { getMediaUploadPresentation, type MediaUploadStage } from "@/lib/media-upload-state";

export function UploadProgressCard({ stage, onRetry }: { stage: MediaUploadStage; onRetry?: () => void }) {
  const colors = useColors();
  const pulse = useSharedValue(0.55);
  const presentation = getMediaUploadPresentation(stage);
  const isActive = presentation.tone === "active";

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: isActive ? pulse.value : 1 }));
  const accent = presentation.tone === "error" ? colors.error : presentation.tone === "warning" ? colors.warning : presentation.tone === "success" ? colors.success : colors.primary;

  return (
    <View accessibilityLabel={`${presentation.label}. ${presentation.detail}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.dot, { backgroundColor: accent }, pulseStyle]} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.foreground }]}>{presentation.label}</Text>
          <Text style={[styles.detail, { color: colors.muted }]}>{presentation.detail}</Text>
        </View>
        {onRetry && <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [styles.retry, { borderColor: accent, opacity: pressed ? 0.65 : 1 }]}><Text style={[styles.retryText, { color: accent }]}>Retry</Text></Pressable>}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.progress, { width: `${Math.round(presentation.progress * 100)}%`, backgroundColor: accent }]} /></View>
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
