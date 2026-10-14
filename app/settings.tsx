import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

type SettingLink = {
  title: string;
  detail: string;
  icon: Parameters<typeof IconSymbol>[0]["name"];
  route: string;
  requiresAuth?: boolean;
};

const groups: { title: string; items: SettingLink[] }[] = [
  {
    title: "YOUR ACCOUNT",
    items: [
      { title: "Profile & appearance", detail: "Public profile, interests and theme", icon: "person.crop.circle.fill", route: "/profile" },
      { title: "Account & privacy", detail: "Username history, profile privacy and visibility", icon: "lock.fill", route: "/account-settings", requiresAuth: true },
      { title: "Personal details", detail: "Private account information", icon: "person.text.rectangle.fill", route: "/personal-details", requiresAuth: true },
    ],
  },
  {
    title: "YOUR LEKKA",
    items: [
      { title: "Notifications", detail: "Review activity from your local network", icon: "bell.fill", route: "/notifications" },
      { title: "Saved posts", detail: "Return to posts you bookmarked", icon: "bookmark.fill", route: "/saved" },
      { title: "Location & discovery", detail: "Explore nearby posts, places and listings", icon: "location.fill", route: "/(tabs)/nearby" },
      { title: "Business tools", detail: "Manage your business profiles", icon: "briefcase.fill", route: "/business-profiles", requiresAuth: true },
    ],
  },
  {
    title: "HELP",
    items: [
      { title: "Send feedback", detail: "Report a problem or suggest an improvement", icon: "bubble.left.and.bubble.right.fill", route: "/feedback" },
    ],
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { isAuthenticated } = useSupabaseAuth();

  const open = (item: SettingLink) => {
    if (item.requiresAuth && !isAuthenticated) {
      router.push("/auth" as never);
      return;
    }
    router.push(item.route as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="chevron.right" size={21} color={colors.foreground} style={styles.backIcon} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Menu</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>One place for your account and Lekka preferences.</Text>
        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.muted }]}>{group.title}</Text>
            <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {group.items.map((item, index) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => open(item)}
                  style={({ pressed }) => [styles.row, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, pressed && styles.pressed]}
                >
                  <View style={[styles.iconTile, { backgroundColor: `${colors.primary}18` }]}>
                    <IconSymbol name={item.icon} size={19} color={colors.primary} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text numberOfLines={2} style={[styles.rowDetail, { color: colors.muted }]}>{item.detail}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={17} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 36 },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 13, fontWeight: "700" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 8 },
  group: { marginTop: 18 },
  groupTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8, marginLeft: 3 },
  list: { borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 10, gap: 11 },
  iconTile: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowDetail: { fontSize: 11, lineHeight: 15 },
  pressed: { opacity: 0.72 },
});
