import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getLastKnownOrCurrentLocation, type DeviceLocation } from "@/lib/location";
import { loadSettings, type DiscoveryContentType } from "@/lib/local-radar";
import { discoverNearby, discoveryDistanceLabel, type DiscoveryItem } from "@/lib/discovery";

type Category = { label: string; value: DiscoveryContentType; icon: "building.2.fill" | "tag.fill" | "calendar" | "cart.fill" | "briefcase.fill" | "wrench.and.screwdriver.fill" };
const categories: Category[] = [
  { label: "Businesses", value: "business", icon: "building.2.fill" },
  { label: "Deals", value: "deal", icon: "tag.fill" },
  { label: "Events", value: "event", icon: "calendar" },
  { label: "Marketplace", value: "marketplace", icon: "cart.fill" },
  { label: "Jobs", value: "job", icon: "briefcase.fill" },
  { label: "Services", value: "service", icon: "wrench.and.screwdriver.fill" },
];

export default function LocalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiscoveryItem | null>(null);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await loadSettings();
      const result = await getLastKnownOrCurrentLocation(settings.area);
      if (result.status !== "granted") throw new Error("Choose an area in Radar or enable location to discover local listings.");
      setLocation(result.location);
      const discovery = await discoverNearby({ location: result.location, contentType: selectedCategory.value, search: search.trim(), radiusMeters: radiusToMeters(settings.radius) });
      if (discovery.error) throw discovery.error;
      setItems(discovery.data);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => { void loadDirectory(); }, 350);
    return () => clearTimeout(timeout);
  }, [loadDirectory]);

  return <ScreenContainer>
    <FlatList data={items} keyExtractor={(item) => `${item.sourceType}:${item.id}`} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ListHeaderComponent={<View>
      <View style={styles.headerRow}><View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>Local</Text><View style={styles.locationLine}><IconSymbol name="location.fill" size={14} color={colors.primary} /><Text style={[styles.location, { color: colors.muted }]}>{location?.area || "your area"}</Text><Text style={[styles.locationHint, { color: colors.muted }]}>· same discovery area</Text></View></View><View style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.countText, { color: colors.muted }]}>{items.length}</Text></View></View>
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={19} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Search this area" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} returnKeyType="search" /></View>
      <FlatList data={categories} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} keyExtractor={(item) => item.value} renderItem={({ item }) => { const selected = selectedCategory.value === item.value; return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Browse ${item.label} nearby`} onPress={() => { setSelectedCategory(item); setSearch(""); }} style={[styles.categoryChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}><IconSymbol name={item.icon} size={16} color={selected ? colors.background : colors.muted} /><Text style={[styles.categoryText, { color: selected ? colors.background : colors.muted }]}>{item.label}</Text></Pressable>; }} />
      <View style={styles.resultHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedCategory.label}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{items.length} nearby</Text></View>
    </View>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => setSelectedItem(item)} style={({ pressed }) => [styles.listing, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.listingIcon, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={selectedCategory.icon} size={19} color={colors.primary} /></View><View style={styles.listingCopy}><Text numberOfLines={1} style={[styles.listingTitle, { color: colors.foreground }]}>{item.title}</Text><Text numberOfLines={1} style={[styles.listingMeta, { color: colors.muted }]}>{selectedCategory.label} · {discoveryDistanceLabel(item.distanceMeters)} · {item.area}{item.verified ? " · Verified" : ""}</Text><Text numberOfLines={2} style={[styles.listingDescription, { color: colors.muted }]}>{item.description || "Local listing"}</Text></View><IconSymbol name="chevron.right" size={17} color={colors.muted} /></Pressable>} ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Finding {selectedCategory.label.toLowerCase()} nearby…</Text></View> : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.background }]}><IconSymbol name="location.fill" size={19} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{error ? "Couldn't load local discovery" : `No ${selectedCategory.label.toLowerCase()} nearby`}</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{error || (search ? "Try another search term." : "Lekka will show matching local listings as they become available.")}</Text><Pressable accessibilityRole="button" onPress={() => void loadDirectory()} style={styles.ghostButton}><Text style={[styles.ghostText, { color: colors.primary }]}>Try again</Text></Pressable></View>} />
    <Modal visible={selectedItem !== null} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}><View style={styles.sheetOverlay}><Pressable style={styles.sheetDismiss} onPress={() => setSelectedItem(null)} accessibilityLabel="Close local details" /><View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(28, insets.bottom + 20) }]}><View style={[styles.grabber, { backgroundColor: colors.border }]} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selectedItem?.title}</Text><Text style={[styles.sheetMeta, { color: colors.muted }]}>{selectedCategory.label} · {selectedItem ? discoveryDistanceLabel(selectedItem.distanceMeters) : ""} · {selectedItem?.area}</Text><Text style={[styles.sheetBody, { color: colors.foreground }]}>{selectedItem?.description || "Local listing"}</Text><Pressable accessibilityRole="button" onPress={() => setSelectedItem(null)} style={[styles.sheetButton, { backgroundColor: colors.primary }]}><Text style={[styles.sheetButtonText, { color: colors.background }]}>Done</Text></Pressable></View></View></Modal>
  </ScreenContainer>;
}

function radiusToMeters(radius: string) { if (radius.includes("500")) return 500; if (radius.includes("1 km")) return 1000; if (radius.includes("5 km")) return 5000; if (radius.includes("10 km")) return 10000; return 25000; }
const styles = StyleSheet.create({ content: { padding: 16, paddingBottom: 36 }, headerRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerCopy: { flex: 1 }, title: { fontSize: 22, lineHeight: 28, fontWeight: "700" }, locationLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }, location: { fontSize: 12 }, locationHint: { fontSize: 11 }, countPill: { minWidth: 38, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, countText: { fontSize: 12, fontWeight: "700" }, search: { borderWidth: 1, borderRadius: 14, height: 46, marginTop: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 }, searchInput: { flex: 1, fontSize: 14 }, categoryRow: { gap: 8, paddingTop: 11, paddingRight: 16 }, categoryChip: { minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, categoryText: { fontSize: 13, fontWeight: "600" }, resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 19, marginBottom: 9 }, sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700" }, resultMeta: { fontSize: 12 }, loading: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 }, empty: { minHeight: 180, borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", justifyContent: "center" }, emptyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 9 }, emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", textAlign: "center" }, emptyText: { maxWidth: 300, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 }, ghostButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, marginTop: 4 }, ghostText: { fontSize: 13, fontWeight: "600" }, listing: { minHeight: 82, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 8 }, listingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 11 }, listingCopy: { flex: 1, minWidth: 0 }, listingTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" }, listingMeta: { fontSize: 12, lineHeight: 16, marginTop: 1 }, listingDescription: { fontSize: 12, lineHeight: 16, marginTop: 2 }, pressed: { opacity: 0.78 }, sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.62)" }, sheetDismiss: { flex: 1 }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, grabber: { width: 32, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 }, sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" }, sheetMeta: { fontSize: 12, marginTop: 4 }, sheetBody: { fontSize: 15, lineHeight: 22, marginTop: 16 }, sheetButton: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 20 }, sheetButtonText: { fontSize: 14, fontWeight: "700" } });
