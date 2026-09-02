import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { loadMyProfile } from "@/lib/profile";
import { getAvatarInitials } from "@/lib/profile-avatar";
import { supabase } from "@/lib/supabase";

type MenuItem = { title: string; detail: string; icon: Parameters<typeof IconSymbol>[0]["name"]; route: string };

const menuItems: MenuItem[] = [
  { title: "Buddies", detail: "Requests and mutual local connections", icon: "person.2.fill", route: "/buddies" },
  { title: "Communities", detail: "Your local groups", icon: "person.3.fill", route: "/(tabs)/social" },
  { title: "Saved", detail: "Posts you want to revisit", icon: "bookmark.fill", route: "/saved" },
  { title: "Notifications", detail: "Activity around your local network", icon: "bell.fill", route: "/notifications" },
  { title: "Local Radar", detail: "Discover nearby places and alerts", icon: "location.fill", route: "/(tabs)/nearby" },
  { title: "Account settings", detail: "Username and account controls", icon: "gearshape.fill", route: "/account-settings" },
  { title: "Beta feedback", detail: "Tell Lekka what to improve", icon: "bubble.left.and.bubble.right.fill", route: "/feedback" },
];

export default function MenuScreen() {
  const colors = useColors();
  const { user, isAuthenticated, logout } = useSupabaseAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) { setDisplayName(null); setUsername(null); setIsPlatformAdmin(false); return () => { active = false; }; }
    void loadMyProfile().then(({ data }) => { if (active) { setDisplayName(data?.display_name ?? null); setUsername(data?.username ?? null); } });
    void supabase?.rpc("is_platform_admin", { target_user: user.id }).then(({ data }) => { if (active) setIsPlatformAdmin(data === true); });
    return () => { active = false; };
  }, [user?.id]));

  useEffect(() => {
    if (!user) setIsPlatformAdmin(false);
  }, [user]);

  const signOut = async () => {
    setSignOutOpen(false);
    await logout();
    router.replace("/auth" as never);
  };

  const visibleMenuItems = isPlatformAdmin
    ? [...menuItems, { title: "Yoco TEST setup", detail: "Create the secure Yoco payment webhook", icon: "cart.fill" as Parameters<typeof IconSymbol>[0]["name"], route: "/admin-yoco" }]
    : menuItems;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={23} color={colors.foreground} style={styles.backIcon} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>Menu</Text></View><Pressable accessibilityRole="button" onPress={() => router.push(isAuthenticated ? "/profile" as never : "/auth" as never)} style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>{getAvatarInitials(displayName)}</Text></View><View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>{isAuthenticated ? displayName || "Your Lekka profile" : "Join Lekka"}</Text><Text style={[styles.profileDetail, { color: colors.muted }]}>{isAuthenticated ? username ? `@${username}` : "View and edit your profile" : "Sign in to personalize your local network"}</Text></View><IconSymbol name="chevron.right" size={22} color={colors.muted} /></Pressable><Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR LEKKA</Text><View style={styles.grid}>{visibleMenuItems.map((item) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.iconTile, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={item.icon} size={22} color={colors.primary} /></View><Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text><Text numberOfLines={2} style={[styles.menuDetail, { color: colors.muted }]}>{item.detail}</Text></Pressable>)}</View><Text style={[styles.sectionLabel, { color: colors.muted }]}>SUPPORT</Text><Pressable onPress={() => router.push("/feedback" as never)} style={[styles.supportCard, { borderColor: colors.border }]}><IconSymbol name="bubble.left.and.bubble.right.fill" size={20} color={colors.primary} /><View style={styles.supportCopy}><Text style={[styles.supportTitle, { color: colors.foreground }]}>Report a problem</Text><Text style={[styles.supportDetail, { color: colors.muted }]}>Send a bug report or feature request from inside Lekka.</Text></View><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable>{isAuthenticated && <Pressable accessibilityRole="button" onPress={() => setSignOutOpen(true)} style={styles.signOut}><IconSymbol name="close" size={18} color={colors.error} /><Text style={[styles.signOutText, { color: colors.error }]}>Sign out</Text></Pressable>}</ScrollView>
    <Modal visible={signOutOpen} transparent animationType="slide" onRequestClose={() => setSignOutOpen(false)}><View style={styles.sheetOverlay}><Pressable style={styles.sheetDismiss} onPress={() => setSignOutOpen(false)} accessibilityLabel="Close sign out confirmation" /><View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.grabber, { backgroundColor: colors.border }]} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sign out of Lekka?</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>You can sign back in whenever you are ready.</Text><View style={styles.confirmRow}><Pressable accessibilityRole="button" onPress={() => setSignOutOpen(false)} style={[styles.confirmButton, { borderColor: colors.border }]}><Text style={[styles.confirmText, { color: colors.foreground }]}>Cancel</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void signOut()} style={[styles.confirmButton, { backgroundColor: colors.error, borderColor: colors.error }]}><Text style={styles.deleteText}>Sign out</Text></Pressable></View></View></View></Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 42 }, header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 21 }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, backIcon: { transform: [{ rotate: "180deg" }] }, title: { fontSize: 24, lineHeight: 30, fontWeight: "800" }, profileCard: { minHeight: 86, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#10211D", fontSize: 16, fontWeight: "900" }, profileCopy: { flex: 1 }, profileName: { fontSize: 16, fontWeight: "800" }, profileDetail: { fontSize: 12, marginTop: 4 }, sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 24, marginBottom: 10 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, menuCard: { width: "48.5%", minHeight: 144, borderWidth: 1, borderRadius: 14, padding: 13 }, iconTile: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, menuTitle: { fontSize: 15, fontWeight: "800", marginTop: 15 }, menuDetail: { fontSize: 11, lineHeight: 16, marginTop: 5 }, supportCard: { minHeight: 58, borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 }, supportCopy: { flex: 1 }, supportTitle: { fontSize: 14, fontWeight: "800" }, supportDetail: { fontSize: 11, lineHeight: 16, marginTop: 3 }, signOut: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 23 }, signOutText: { fontSize: 14, fontWeight: "800" }, pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] }, sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.62)" }, sheetDismiss: { flex: 1 }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, padding: 20, paddingBottom: 28 }, grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 }, sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800" }, sheetSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 18 }, confirmRow: { flexDirection: "row", gap: 10 }, confirmButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, confirmText: { fontSize: 14, fontWeight: "700" }, deleteText: { color: "#FFF", fontSize: 14, fontWeight: "800" } });