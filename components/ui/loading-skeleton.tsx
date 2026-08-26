import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function LoadingSkeleton({
  style,
  label = "Loading",
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const colors = useColors();

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.base, { backgroundColor: colors.border }, style]}
    />
  );
}

export function FeedSkeletonList() {
  return (
    <View accessibilityLabel="Loading local feed" style={styles.list}>
      {["feed-one", "feed-two", "feed-three"].map((key) => (
        <View key={key} style={styles.feedCard}>
          <View style={styles.feedHeader}>
            <LoadingSkeleton style={styles.feedAvatar} />
            <View style={styles.feedHeaderCopy}>
              <LoadingSkeleton style={styles.feedAuthor} />
              <LoadingSkeleton style={styles.feedMeta} />
            </View>
            <LoadingSkeleton style={styles.chevron} />
          </View>
          <LoadingSkeleton style={styles.feedTitle} />
          <LoadingSkeleton style={styles.feedBody} />
          <LoadingSkeleton style={styles.feedBodyShort} />
          <View style={styles.feedActions}>
            <LoadingSkeleton style={styles.action} />
            <LoadingSkeleton style={styles.action} />
            <LoadingSkeleton style={styles.actionWide} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function NearbySkeletonList() {
  return (
    <View accessibilityLabel="Loading nearby results" style={styles.list}>
      {["nearby-one", "nearby-two", "nearby-three"].map((key) => (
        <View key={key} style={styles.nearbyCard}>
          <LoadingSkeleton style={styles.nearbyIcon} />
          <View style={styles.nearbyCopy}>
            <View style={styles.nearbyTitleRow}>
              <LoadingSkeleton style={styles.nearbyTitle} />
              <LoadingSkeleton style={styles.chevron} />
            </View>
            <LoadingSkeleton style={styles.nearbySubtitle} />
            <LoadingSkeleton style={styles.nearbyMeta} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8 },
  list: { gap: 12 },
  feedCard: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(128,128,128,0.15)", padding: 16, marginBottom: 12 },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedAvatar: { width: 38, height: 38, borderRadius: 13 },
  feedHeaderCopy: { flex: 1, gap: 6 },
  feedAuthor: { width: "58%", height: 13 },
  feedMeta: { width: "40%", height: 10 },
  chevron: { width: 18, height: 18, borderRadius: 9 },
  feedTitle: { width: "78%", height: 17, marginTop: 18 },
  feedBody: { width: "100%", height: 13, marginTop: 10 },
  feedBodyShort: { width: "64%", height: 13, marginTop: 7 },
  feedActions: { flexDirection: "row", gap: 18, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.15)", marginTop: 16, paddingTop: 13 },
  action: { width: 42, height: 12 },
  actionWide: { width: 54, height: 12 },
  nearbyCard: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: "rgba(128,128,128,0.15)", padding: 14, marginBottom: 10 },
  nearbyIcon: { width: 48, height: 48, borderRadius: 15, marginRight: 12 },
  nearbyCopy: { flex: 1, gap: 8 },
  nearbyTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nearbyTitle: { width: "68%", height: 15 },
  nearbySubtitle: { width: "76%", height: 12 },
  nearbyMeta: { width: "44%", height: 10 },
});
