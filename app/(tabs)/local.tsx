import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { listLocalDirectory, type LocalDirectoryItem } from "@/lib/local-directory";

type Category = { label: string; icon: "building.2.fill" | "tag.fill" | "calendar" | "cart.fill" | "briefcase.fill" | "wrench.and.screwdriver.fill"; caption: string; color: string };
type Business = LocalDirectoryItem;

const categories: Category[] = [
  { label: "Businesses", icon: "building.2.fill", caption: "Find trusted local places", color: "#2F7D67" },
  { label: "Deals", icon: "tag.fill", caption: "Good value, close by", color: "#E9A23B" },
  { label: "Events", icon: "calendar", caption: "Plans for your area", color: "#5E6AD2" },
  { label: "Marketplace", icon: "cart.fill", caption: "Buy and sell nearby", color: "#8A6A4A" },
  { label: "Jobs", icon: "briefcase.fill", caption: "Work in your city", color: "#D95D4F" },
  { label: "Services", icon: "wrench.and.screwdriver.fill", caption: "People who can help", color: "#4E8D8A" },
];

export default function LocalScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState("Businesses");
  const [search, setSearch] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = async (category: string) => {
    setLoading(true);
    const result = await listLocalDirectory(category);
    setBusinesses((result.data ?? []) as Business[]);
    setError(result.error ? "We couldn’t load local listings. Check your connection and try again." : null);
    setLoading(false);
  };

  useEffect(() => { void loadDirectory(selectedCategory); }, [selectedCategory]);

  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return businesses;
    return businesses.filter((business) => `${business.name} ${business.description} ${business.area} ${business.category}`.toLowerCase().includes(query));
  }, [businesses, search]);

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL LIFE</Text><Text style={[styles.title, { color: colors.foreground }]}>Useful around you</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Discover verified local listings when businesses publish them.</Text><View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search live local listings…" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View><Text style={[styles.filterLabel, { color: colors.muted }]}>EXPLORE BY CATEGORY</Text><View style={styles.grid}>{categories.map((item) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`Browse ${item.label}`} onPress={() => { setSelectedCategory(item.label); setSearch(""); }} style={[styles.category, { backgroundColor: selectedCategory === item.label ? `${item.color}20` : colors.surface, borderColor: selectedCategory === item.label ? item.color : colors.border }]}><View style={[styles.categoryIcon, { backgroundColor: `${item.color}20` }]}><IconSymbol name={item.icon} size={23} color={item.color} /></View><Text style={[styles.categoryLabel, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.categoryCaption, { color: colors.muted }]}>{item.caption}</Text></Pressable>)}</View><View style={styles.resultHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedCategory}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{filteredBusinesses.length} live listings</Text></View>{loading ? <View style={styles.status}><ActivityIndicator color={colors.primary} /><Text style={[styles.statusText, { color: colors.muted }]}>Loading local listings…</Text></View> : error ? <Text accessibilityRole="alert" style={[styles.statusText, { color: colors.error }]}>{error}</Text> : filteredBusinesses.length === 0 ? <View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="building.2.fill" size={27} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No live listings yet</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{search ? "Try another search or category." : "This area will fill as local businesses publish their profiles."}</Text></View> : filteredBusinesses.map((business) => <Pressable key={business.id} onPress={() => Alert.alert(business.name, `${business.description || "Local listing"}\n\n${business.area}`)} style={[styles.listing, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.listingIcon, { backgroundColor: `${colors.primary}20` }]}><IconSymbol name={business.kind === "event" ? "calendar" : business.kind === "deal" ? "tag.fill" : business.kind === "post" ? "bubble.left.fill" : "building.2.fill"} size={21} color={colors.primary} /></View><View style={styles.listingCopy}><Text style={[styles.listingTitle, { color: colors.foreground }]}>{business.name}</Text><Text style={[styles.listingMeta, { color: colors.muted }]}>{business.category} · {business.area}</Text><Text style={[styles.listingDescription, { color: colors.muted }]} numberOfLines={2}>{business.description || "Local business listing"}</Text></View><IconSymbol name="chevron.right" size={18} color={colors.muted} /></Pressable>)}<View style={[styles.featured, { backgroundColor: colors.foreground }]}><View style={styles.featuredTop}><View style={styles.featuredBadge}><IconSymbol name="checkmark.seal.fill" size={16} color="#E9A23B" /><Text style={styles.featuredBadgeText}>TRUSTED LOCAL</Text></View><IconSymbol name="arrow.up.right" size={20} color="#E9A23B" /></View><Text style={[styles.featuredTitle, { color: colors.background }]}>Support the places that support your area.</Text><Text style={[styles.featuredText, { color: `${colors.background}AA` }]}>Verified businesses can share updates, offers, jobs, and events directly with nearby customers.</Text></View></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, title: { fontSize: 28, fontWeight: "800", marginTop: 6 }, subtitle: { fontSize: 13, lineHeight: 18, marginTop: 5 }, search: { borderWidth: 1, borderRadius: 16, height: 48, marginTop: 19, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 }, searchInput: { flex: 1, fontSize: 14 }, filterLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 21 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }, category: { width: "48.3%", borderWidth: 1, borderRadius: 18, padding: 14, minHeight: 128 }, categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 13 }, categoryLabel: { fontSize: 14, fontWeight: "800" }, categoryCaption: { fontSize: 11, lineHeight: 15, marginTop: 4 }, resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 11 }, sectionTitle: { fontSize: 18, fontWeight: "800" }, resultMeta: { fontSize: 12 }, status: { alignItems: "center", gap: 9, paddingVertical: 24 }, statusText: { fontSize: 13, lineHeight: 19, textAlign: "center" }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 22, alignItems: "center", gap: 7 }, emptyTitle: { fontSize: 14, fontWeight: "800" }, emptyText: { textAlign: "center", fontSize: 12, lineHeight: 17 }, listing: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 }, listingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 11 }, listingCopy: { flex: 1 }, listingTitle: { fontSize: 15, fontWeight: "800" }, listingMeta: { fontSize: 12, marginTop: 3 }, listingDescription: { fontSize: 12, lineHeight: 17, marginTop: 5 }, featured: { borderRadius: 20, padding: 17, marginTop: 20 }, featuredTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, featuredBadge: { flexDirection: "row", alignItems: "center", gap: 6 }, featuredBadgeText: { color: "#E9A23B", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 }, featuredTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800", marginTop: 18 }, featuredText: { fontSize: 12, lineHeight: 18, marginTop: 7 },
});

