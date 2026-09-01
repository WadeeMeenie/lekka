import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { listLocalDirectory, type LocalDirectoryItem } from "@/lib/local-directory";
import { useColors } from "@/hooks/use-colors";

type Category = { label: string; icon: "building.2.fill" | "tag.fill" | "calendar" | "cart.fill" | "briefcase.fill" | "wrench.and.screwdriver.fill" };
type Business = LocalDirectoryItem;

const categories: Category[] = [
  { label: "Businesses", icon: "building.2.fill" },
  { label: "Deals", icon: "tag.fill" },
  { label: "Events", icon: "calendar" },
  { label: "Marketplace", icon: "cart.fill" },
  { label: "Jobs", icon: "briefcase.fill" },
  { label: "Services", icon: "wrench.and.screwdriver.fill" },
];

export default function LocalScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState("Businesses");
  const [search, setSearch] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const loadDirectory = async (category = selectedCategory) => {
    setLoading(true);
    setError(null);
    try {
      setBusinesses(await listLocalDirectory(category));
    } catch (err) {
      setBusinesses([]);
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useMemo(() => {
    void loadDirectory();
  }, [selectedCategory]);

  const filteredBusinesses = businesses.filter((business) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${business.name} ${business.category} ${business.area} ${business.description}`.toLowerCase().includes(query);
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL</Text>
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>Useful around you</Text>
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={19} color={colors.muted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search local listings" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((item) => {
            const selected = selectedCategory === item.label;
            return <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Browse ${item.label}`} onPress={() => { setSelectedCategory(item.label); setSearch(""); }} style={[styles.categoryChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}><IconSymbol name={item.icon} size={17} color={selected ? colors.background : colors.muted} /><Text style={[styles.categoryText, { color: selected ? colors.background : colors.muted }]}>{item.label}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.resultHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedCategory}</Text>
          <Text style={[styles.resultMeta, { color: colors.muted }]}>{filteredBusinesses.length} live listings</Text>
        </View>

        {loading ? <View style={styles.skeletonGroup}>{[1, 2, 3].map((item) => <View key={item} style={[styles.skeleton, { backgroundColor: colors.surface }]} />)}</View> : error ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.background }]}><IconSymbol name="exclamationmark.triangle.fill" size={19} color={colors.error} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn't load listings</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void loadDirectory(selectedCategory)} style={styles.ghostButton}><Text style={[styles.ghostText, { color: colors.primary }]}>Try again</Text></Pressable></View> : filteredBusinesses.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.emptyIcon, { backgroundColor: colors.background }]}><IconSymbol name="building.2.fill" size={19} color={colors.muted} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No live listings yet</Text><Text style={[styles.emptyText, { color: colors.muted }]}>{search ? "Try another search or category." : "Local listings will appear here as businesses publish their profiles."}</Text><Pressable accessibilityRole="button" onPress={() => setSearch("")} style={styles.ghostButton}><Text style={[styles.ghostText, { color: colors.primary }]}>{search ? "Clear search" : "Browse another category"}</Text></Pressable></View> : filteredBusinesses.map((business) => <Pressable key={business.id} accessibilityRole="button" accessibilityLabel={`Open ${business.name}`} onPress={() => setSelectedBusiness(business)} style={({ pressed }) => [styles.listing, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><View style={[styles.listingIcon, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={business.kind === "event" ? "calendar" : business.kind === "deal" ? "tag.fill" : business.kind === "post" ? "bubble.left.fill" : "building.2.fill"} size={19} color={colors.primary} /></View><View style={styles.listingCopy}><Text numberOfLines={1} style={[styles.listingTitle, { color: colors.foreground }]}>{business.name}</Text><Text numberOfLines={1} style={[styles.listingMeta, { color: colors.muted }]}>{business.category} · {business.area}</Text><Text numberOfLines={2} style={[styles.listingDescription, { color: colors.muted }]}>{business.description || "Local listing"}</Text></View><IconSymbol name="chevron.right" size={17} color={colors.muted} /></Pressable>)}
      </ScrollView>

      <Modal visible={selectedBusiness !== null} transparent animationType="slide" onRequestClose={() => setSelectedBusiness(null)}><View style={styles.sheetOverlay}><Pressable style={styles.sheetDismiss} onPress={() => setSelectedBusiness(null)} accessibilityLabel="Close listing details" /><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={[styles.grabber, { backgroundColor: colors.border }]} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selectedBusiness?.name}</Text><Text style={[styles.sheetMeta, { color: colors.muted }]}>{selectedBusiness?.category} · {selectedBusiness?.area}</Text><Text style={[styles.sheetBody, { color: colors.foreground }]}>{selectedBusiness?.description || "Local listing"}</Text><Pressable accessibilityRole="button" onPress={() => setSelectedBusiness(null)} style={[styles.sheetButton, { backgroundColor: colors.primary }]}><Text style={[styles.sheetButtonText, { color: colors.background }]}>Done</Text></Pressable></View></View></Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36 },
  headerRow: { minHeight: 52, justifyContent: "center" },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", marginTop: 2 },
  search: { borderWidth: 1, borderRadius: 14, height: 48, marginTop: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, fontSize: 14 },
  categoryRow: { gap: 8, paddingTop: 12, paddingRight: 16 },
  categoryChip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  categoryText: { fontSize: 13, fontWeight: "500" },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  resultMeta: { fontSize: 12 },
  skeletonGroup: { gap: 10 },
  skeleton: { height: 88, borderRadius: 14 },
  empty: { minHeight: 160, borderWidth: 1, borderRadius: 18, padding: 20, alignItems: "center", justifyContent: "center" },
  emptyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  emptyText: { maxWidth: 300, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 },
  ghostButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  ghostText: { fontSize: 13, fontWeight: "600" },
  listing: { minHeight: 76, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  listingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 11 },
  listingCopy: { flex: 1, minWidth: 0 },
  listingTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  listingMeta: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  listingDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheetDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 28 },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  sheetMeta: { fontSize: 12, marginTop: 4 },
  sheetBody: { fontSize: 15, lineHeight: 22, marginTop: 16 },
  sheetButton: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 20 },
  sheetButtonText: { fontSize: 14, fontWeight: "700" },
});
