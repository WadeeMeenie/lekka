import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DiscoveryContentType, loadSettings, saveSettings } from "@/lib/local-radar";
import { DeviceLocation, getLastKnownOrCurrentLocation, requestApproximateLocation, searchLocation, watchMeaningfulForegroundLocation } from "@/lib/location";
import { discoverNearby, discoveryDistanceLabel, type DiscoveryItem } from "@/lib/discovery";
import { useColors } from "@/hooks/use-colors";
import { NearbySkeletonList } from "@/components/ui/loading-skeleton";
import { getFetchPresentation } from "@/lib/loading-state";

const contentTypes: Array<{ label: string; value: DiscoveryContentType }> = [
  { label: "All", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Businesses", value: "business" },
  { label: "Events", value: "event" },
  { label: "Deals", value: "deal" },
  { label: "Jobs", value: "job" },
  { label: "Marketplace", value: "marketplace" },
  { label: "Services", value: "service" },
  { label: "Alerts", value: "alert" },
];
const radiusOptions = ["500 m", "1 km", "5 km", "10 km", "City"];

export default function NearbyScreen() {
  const colors = useColors();
  const [contentType, setContentType] = useState<DiscoveryContentType>("all");
  const [radius, setRadius] = useState("5 km");
  const [locationStatus, setLocationStatus] = useState<"manual" | "granted" | "denied">("manual");
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaError, setAreaError] = useState<string | null>(null);
  const [searchingArea, setSearchingArea] = useState(false);

  const refreshDiscovery = async (location: DeviceLocation, nextRadius = radius, nextType = contentType, background = false) => {
    setCurrentLocation(location);
    if (background) setRefreshing(true);
    try {
      const result = await discoverNearby({ location, contentType: nextType, radiusMeters: radiusToMeters(nextRadius) });
      if (!result.error) setItems(result.data);
    } finally {
      if (background) setRefreshing(false);
    }
  };

  const useCurrentLocation = async () => {
    const result = await requestApproximateLocation(currentLocation?.area || "your area");
    if (result.status !== "granted") { setLocationStatus("denied"); return; }
    const settings = await loadSettings();
    await saveSettings({ ...settings, area: result.location.area, useLocation: true, selectedLocation: null });
    setLocationStatus("granted");
    setAreaPickerOpen(false);
    await refreshDiscovery(result.location, radius, contentType, true);
  };

  const exploreArea = async () => {
    if (!areaQuery.trim()) return;
    setSearchingArea(true);
    setAreaError(null);
    try {
      const result = await searchLocation(`${areaQuery.trim()}, South Africa`, currentLocation?.area || "your area");
      if (result.status !== "granted") { setAreaError("We couldn't find that South African location. Try a suburb, town or city."); return; }
      const settings = await loadSettings();
      await saveSettings({ ...settings, area: result.location.area, useLocation: false, selectedLocation: result.location });
      setLocationStatus("manual");
      setAreaPickerOpen(false);
      setAreaQuery("");
      await refreshDiscovery(result.location, radius, contentType, true);
    } finally {
      setSearchingArea(false);
    }
  };

  useEffect(() => {
    let active = true;
    let stopWatching: () => void = () => undefined;
    void (async () => {
      const settings = await loadSettings();
      if (!active) return;
      setRadius(settings.radius);
      if (settings.selectedLocation) {
        setLocationStatus("manual");
        await refreshDiscovery(settings.selectedLocation, settings.radius, contentType);
      } else {
        const result = await getLastKnownOrCurrentLocation(settings.area);
        if (!active) return;
        if (result.status === "granted") {
          setLocationStatus("granted");
          await refreshDiscovery(result.location, settings.radius, contentType);
          if (active) stopWatching = await watchMeaningfulForegroundLocation((next) => { if (active) void refreshDiscovery(next, radius, contentType, true); }, result.location.area);
        } else {
          setLocationStatus("denied");
          setItems([]);
        }
      }
      if (active) setInitialLoading(false);
    })().catch(() => { if (active) { setItems([]); setInitialLoading(false); } });
    return () => { active = false; stopWatching(); };
  }, []);

  useEffect(() => {
    if (!currentLocation || initialLoading) return;
    void refreshDiscovery(currentLocation, radius, contentType, true);
  }, [contentType]);

  const setDiscoveryRadius = (nextRadius: string) => {
    setRadius(nextRadius);
    void loadSettings().then(async (settings) => {
      await saveSettings({ ...settings, radius: nextRadius });
      if (currentLocation) await refreshDiscovery(currentLocation, nextRadius, contentType, true);
    });
  };

  const presentation = getFetchPresentation({ isInitialLoading: initialLoading, isRefreshing: refreshing, hasData: items.length > 0 });
  const area = currentLocation?.area || "your area";

  return <ScreenContainer>
    <FlatList data={items} keyExtractor={(item) => `${item.sourceType}:${item.id}`} contentContainerStyle={styles.content}
      ListHeaderComponent={<View>
        <View style={styles.headerRow}><View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL RADAR</Text><Text style={[styles.title, { color: colors.foreground }]}>Around {area}</Text><View style={styles.locationLine}><IconSymbol name="location.fill" size={14} color={colors.primary} /><Text style={[styles.locationText, { color: colors.muted }]}>{locationStatus === "granted" ? "Current location" : "Exploring manually"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Change discovery area" onPress={() => setAreaPickerOpen(true)} style={styles.changeButton}><Text style={[styles.changeText, { color: colors.primary }]}>Change</Text></Pressable></View></View></View>
        <Text style={[styles.filterLabel, { color: colors.muted }]}>RADIUS</Text><FlatList data={radiusOptions} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyExtractor={(item) => item} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: radius === item }} onPress={() => setDiscoveryRadius(item)} style={[styles.chip, { borderColor: radius === item ? colors.primary : colors.border, backgroundColor: radius === item ? `${colors.primary}18` : colors.surface }]}><Text style={[styles.chipText, { color: radius === item ? colors.primary : colors.muted }]}>{item}</Text></Pressable>} />
        <Text style={[styles.filterLabel, { color: colors.muted }]}>DISCOVER</Text><FlatList data={contentTypes} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyExtractor={(item) => item.value} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: contentType === item.value }} onPress={() => setContentType(item.value)} style={[styles.chip, { backgroundColor: contentType === item.value ? colors.foreground : colors.surface, borderColor: contentType === item.value ? colors.foreground : colors.border }]}><Text style={[styles.chipText, { color: contentType === item.value ? colors.background : colors.muted }]}>{item.label}</Text></Pressable>} />
        <View style={styles.resultRow}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{contentTypes.find((item) => item.value === contentType)?.label || "Everything"}</Text><Text style={[styles.resultMeta, { color: colors.muted }]}>{items.length} results</Text></View>{refreshing ? <View style={[styles.syncPill, { backgroundColor: `${colors.primary}12` }]}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.syncText, { color: colors.primary }]}>Updating local discovery</Text></View> : null}
      </View>}
      renderItem={({ item }) => <DiscoveryCard item={item} colors={colors} />}
      ListEmptyComponent={presentation === "skeleton" ? <NearbySkeletonList /> : <EmptyDiscovery colors={colors} />}
    />
    <Modal visible={areaPickerOpen} transparent animationType="slide" onRequestClose={() => setAreaPickerOpen(false)}><View style={styles.sheetOverlay}><Pressable style={styles.sheetDismiss} onPress={() => setAreaPickerOpen(false)} accessibilityLabel="Close area picker" /><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={[styles.grabber, { backgroundColor: colors.border }]} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Explore an area</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Search any suburb, town or city in South Africa. This changes discovery without changing your device location.</Text><View style={[styles.areaSearch, { backgroundColor: colors.background, borderColor: colors.border }]}><IconSymbol name="magnifyingglass" size={18} color={colors.muted} /><TextInput value={areaQuery} onChangeText={(value) => { setAreaQuery(value); setAreaError(null); }} placeholder="e.g. Bellville, Durban, Gqeberha" placeholderTextColor={colors.muted} style={[styles.areaInput, { color: colors.foreground }]} returnKeyType="search" onSubmitEditing={exploreArea} /></View>{areaError ? <Text style={[styles.areaError, { color: colors.error }]}>{areaError}</Text> : null}<Pressable accessibilityRole="button" disabled={searchingArea || !areaQuery.trim()} onPress={exploreArea} style={[styles.currentButton, { backgroundColor: colors.primary, opacity: searchingArea || !areaQuery.trim() ? 0.55 : 1 }]}><Text style={[styles.currentButtonText, { color: colors.background }]}>{searchingArea ? "Finding area…" : "Explore this area"}</Text></Pressable><Pressable accessibilityRole="button" onPress={useCurrentLocation} style={[styles.returnButton, { borderColor: colors.border }]}><Text style={[styles.returnButtonText, { color: colors.foreground }]}>Return to current location</Text></Pressable></View></View></Modal>
  </ScreenContainer>;
}

function radiusToMeters(radius: string) { if (radius.includes("500")) return 500; if (radius.includes("1 km")) return 1000; if (radius.includes("5 km")) return 5000; if (radius.includes("10 km")) return 10000; return 25000; }
function DiscoveryCard({ item, colors }: { item: DiscoveryItem; colors: ReturnType<typeof useColors> }) { const icon = item.sourceType === "alert" ? "exclamationmark.triangle.fill" : item.sourceType === "event" ? "calendar" : item.sourceType === "deal" ? "tag.fill" : item.sourceType === "business" ? "building.2.fill" : item.sourceType === "post" ? "bubble.left.fill" : "wrench.and.screwdriver.fill"; const label = item.sourceType === "post" ? "Post" : item.sourceType[0].toUpperCase() + item.sourceType.slice(1); return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.itemIcon, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={icon} size={20} color={colors.primary} /></View><View style={styles.cardCopy}><Text numberOfLines={1} style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text><Text numberOfLines={1} style={[styles.cardSub, { color: colors.muted }]}>{label} · {discoveryDistanceLabel(item.distanceMeters)} · {item.area}{item.verified ? " · Verified" : ""}</Text><Text numberOfLines={2} style={[styles.cardMeta, { color: colors.muted }]}>{item.description}</Text></View></View>; }
function EmptyDiscovery({ colors }: { colors: ReturnType<typeof useColors> }) { return <View style={[styles.empty, { borderColor: colors.border }]}><IconSymbol name="location.fill" size={26} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Lekka will show local posts, businesses, events, deals, jobs, marketplace listings, services and alerts in this discovery area.</Text></View>; }

const styles = StyleSheet.create({ content: { padding: 16, paddingBottom: 30 }, headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }, title: { fontSize: 22, lineHeight: 28, fontWeight: "700", marginTop: 2 }, locationLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }, locationText: { fontSize: 12 }, changeButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }, changeText: { fontSize: 12, fontWeight: "700" }, filterLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginTop: 12 }, chipRow: { gap: 7, paddingTop: 7, paddingRight: 16 }, chip: { minHeight: 44, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" }, chipText: { fontSize: 12, fontWeight: "600" }, resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 9 }, sectionTitle: { fontSize: 18, fontWeight: "700" }, resultMeta: { fontSize: 12 }, syncPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 9 }, syncText: { fontSize: 11, fontWeight: "600" }, card: { minHeight: 82, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 }, itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11 }, cardCopy: { flex: 1, minWidth: 0 }, cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" }, cardSub: { fontSize: 12, lineHeight: 16, marginTop: 2 }, cardMeta: { fontSize: 11, lineHeight: 15, marginTop: 2 }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 24, alignItems: "center", gap: 8, marginTop: 4 }, emptyTitle: { fontSize: 15, fontWeight: "700" }, emptyText: { fontSize: 12, lineHeight: 18, textAlign: "center" }, sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.62)" }, sheetDismiss: { flex: 1 }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 }, grabber: { width: 32, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 }, sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" }, sheetSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 12 }, areaSearch: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 }, areaInput: { flex: 1, fontSize: 14 }, areaError: { fontSize: 12, lineHeight: 17, marginTop: 8 }, currentButton: { minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 14 }, currentButtonText: { fontSize: 14, fontWeight: "700" }, returnButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 }, returnButtonText: { fontSize: 13, fontWeight: "600" } });
