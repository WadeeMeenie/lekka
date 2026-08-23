import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { listMyBusinessProfiles } from "@/lib/account-repository";
import { defaultActiveIdentity, loadActiveIdentity, saveActiveIdentity, type ActiveIdentity } from "@/lib/active-identity";

type BusinessMembership = {
  role: string;
  businesses: { id: string; name: string; category: string; area: string; verification_state: string; logo_path: string | null } | null;
};

export default function BusinessProfilesScreen() {
  const colors = useColors();
  const [items, setItems] = useState<BusinessMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIdentity, setActiveIdentity] = useState<ActiveIdentity>(defaultActiveIdentity);

  const refresh = async () => {
    setLoading(true);
    const result = await listMyBusinessProfiles();
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setItems((result.data ?? []) as unknown as BusinessMembership[]);
  };

  useEffect(() => {
    void refresh();
    void loadActiveIdentity().then(setActiveIdentity);
  }, []);

  const setPersonalIdentity = async () => {
    const next = await saveActiveIdentity({ kind: "personal" });
    setActiveIdentity(next);
  };

  const setBusinessIdentity = async (businessId: string, businessName: string) => {
    const next = await saveActiveIdentity({ kind: "business", businessId, businessName });
    setActiveIdentity(next);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="chevron.right" size={22} color={colors.foreground} style={styles.backIcon} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR BUSINESS PROFILES</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>One identity. More local presence.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Switching changes your active posting identity locally. It never changes who can edit a business—Supabase still checks your membership.</Text>

        <Pressable accessibilityRole="radio" accessibilityState={{ selected: activeIdentity.kind === "personal" }} onPress={() => void setPersonalIdentity()} style={[styles.personalCard, { backgroundColor: activeIdentity.kind === "personal" ? `${colors.primary}18` : colors.surface, borderColor: activeIdentity.kind === "personal" ? colors.primary : colors.border }]}>
          <IconSymbol name="person.crop.circle.fill" size={19} color={colors.primary} />
          <View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>Personal profile</Text><Text style={[styles.meta, { color: colors.muted }]}>Post and interact as yourself</Text></View>
          <Text style={[styles.currentText, { color: activeIdentity.kind === "personal" ? colors.primary : colors.muted }]}>{activeIdentity.kind === "personal" ? "Active" : "Use"}</Text>
        </Pressable>

        {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : <FlatList
          data={items}
          keyExtractor={(item) => item.businesses?.id ?? item.role}
          ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No business profiles yet</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>Create one when you are ready to be discovered by customers nearby.</Text></View>}
          renderItem={({ item }) => {
            const business = item.businesses;
            if (!business) return null;
            const canPublishAsBusiness = ["owner", "admin", "manager"].includes(item.role);
            const isActive = activeIdentity.kind === "business" && activeIdentity.businessId === business.id;
            const verificationState = business.verification_state ?? "unverified";
            return <View style={[styles.card, { backgroundColor: isActive ? `${colors.primary}18` : colors.surface, borderColor: isActive ? colors.primary : colors.border }]}>
              <View style={[styles.mark, { backgroundColor: colors.primary }]}><IconSymbol name="briefcase.fill" size={18} color="#10211D" /></View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: colors.foreground }]}>{business.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>{business.category} · {business.area} · {verificationState === "verified" ? "Verified" : verificationState === "pending" ? "Verification pending" : "Unverified"}</Text>
                <Text style={[styles.role, { color: colors.muted }]}>{item.role === "manager" ? "Manager" : item.role[0].toUpperCase() + item.role.slice(1)} access</Text>
              </View>
              {canPublishAsBusiness ? <Pressable accessibilityRole="radio" accessibilityState={{ selected: isActive }} onPress={() => void setBusinessIdentity(business.id, business.name)} style={[styles.switchButton, { borderColor: colors.border }]}><Text style={[styles.switchText, { color: isActive ? colors.primary : colors.foreground }]}>{isActive ? "Active" : "Use"}</Text></Pressable> : null}
              {canPublishAsBusiness && verificationState !== "verified" ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/business-verification", params: { businessId: business.id, businessName: business.name, state: verificationState } } as never)} style={[styles.editButton, { borderColor: colors.border }]}><Text style={[styles.editText, { color: colors.foreground }]}>{verificationState === "pending" ? "View" : "Verify"}</Text></Pressable> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/business-setup", params: { businessId: business.id } } as never)} style={[styles.editButton, { borderColor: colors.border }]}><Text style={[styles.editText, { color: colors.foreground }]}>Edit</Text></Pressable>
            </View>;
          }}
        />}
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push("/business-setup" as never)} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.primaryText}>Add a business profile</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 26 },
  backIcon: { transform: [{ rotate: "180deg" }] },
  backText: { fontSize: 14, fontWeight: "700" },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "900" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 9 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  personalCard: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 9 },
  currentText: { fontSize: 11, fontWeight: "900" },
  loader: { marginTop: 28 },
  empty: { borderWidth: 1, borderRadius: 17, padding: 17 },
  emptyTitle: { fontSize: 15, fontWeight: "900" },
  emptyBody: { fontSize: 13, lineHeight: 18, marginTop: 5 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 9, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9 },
  mark: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 155 },
  name: { fontSize: 14, fontWeight: "900" },
  meta: { fontSize: 11, marginTop: 2 },
  role: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  switchButton: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 },
  switchText: { fontSize: 11, fontWeight: "900" },
  editButton: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 7 },
  editText: { fontSize: 11, fontWeight: "900" },
  error: { fontSize: 12, marginTop: 12, fontWeight: "700" },
  primary: { minHeight: 53, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 16 },
  primaryText: { color: "#10211D", fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
