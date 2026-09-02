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
            <LoadingSkeleton style={styles.feedMenu} />
          </View>
          <LoadingSkeleton style={styles.feedCategory} />
          <LoadingSkeleton style={styles.feedBody} />
          <LoadingSkeleton style={styles.feedBodyShort} />
          <View style={styles.feedActions}>
            <LoadingSkeleton style={styles.action} />
            <LoadingSkeleton style={styles.action} />
            <LoadingSkeleton style={styles.action} />
            <LoadingSkeleton style={styles.action} />
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
        <View key={key} style={styles.nearbyRow}>
          <LoadingSkeleton style={styles.nearbyIcon} />
          <View style={styles.nearbyCopy}>
            <LoadingSkeleton style={styles.nearbyTitle} />
            <LoadingSkeleton style={styles.nearbySubtitle} />
            <LoadingSkeleton style={styles.nearbyMeta} />
          </View>
          <LoadingSkeleton style={styles.nearbyChevron} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 8 },
  list: { gap: 10 },
  feedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.15)",
    padding: 14,
    marginBottom: 10,
  },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedAvatar: { width: 40, height: 40, borderRadius: 20 },
  feedHeaderCopy: { flex: 1, gap: 6 },
  feedAuthor: { width: "52%", height: 13 },
  feedMeta: { width: "68%", height: 10 },
  feedMenu: { width: 36, height: 36, borderRadius: 18 },
  feedCategory: { width: 72, height: 22, borderRadius: 11, marginTop: 12 },
  feedBody: { width: "100%", height: 13, marginTop: 12 },
  feedBodyShort: { width: "72%", height: 13, marginTop: 7 },
  feedActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
    marginTop: 14,
    paddingTop: 10,
  },
  action: { width: 48, height: 12, borderRadius: 6 },
  nearbyRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.15)",
    padding: 12,
    marginBottom: 8,
  },
  nearbyIcon: { width: 44, height: 44, borderRadius: 14, marginRight: 12 },
  nearbyCopy: { flex: 1, gap: 7 },
  nearbyTitle: { width: "64%", height: 14 },
  nearbySubtitle: { width: "78%", height: 11 },
  nearbyMeta: { width: "46%", height: 10 },
  nearbyChevron: { width: 18, height: 18, borderRadius: 9, marginLeft: 8 },
});
