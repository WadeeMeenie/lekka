import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RadarCategory, RadarItem, loadSettings, saveSettings } from "@/lib/local-radar";
import { fetchNearbyItems } from "@/lib/supabase-repository";
import { DeviceLocation, getLastKnownOrCurrentLocation, requestApproximateLocation, watchMeaningfulForegroundLocation } from "@/lib/location";
import { useColors } from "@/hooks/use-colors";
import { NearbySkeletonList } from "@/components/ui/loading-skeleton";
import { getFetchPresentation } from "@/lib/loading-state";

const categories: Array<RadarCategory | "All"> = ["All", "Food", "Event", "Deal", "Job", "Marketplace", "Alert", "Service"];
const radiusOptions = ["500 m", "1 km", "5 km", "10 km", "City"];
const explorationAreas = [
  { area: "Bellville", latitude: -33.883, longitude: 18.635 },
  { area: "Stellenbosch", latitude: -33.9321, longitude: 18.8602 },
  { area: "Johannesburg", latitude: -26.2041, longitude: 28.0473 },
];

export default function NearbyScreen() {
  const colors = useColors();
  const [category, setCategory] = useState<RadarCategory | "All">("All");
  const [radius, setRadius] = useState("5 km");
  const [mapView, setMapView] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"manual" | "granted" | "denied">("manual");
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);
  const [manualOverride, setManualOverride] = useState<DeviceLocation | null>(null);
  const [activeArea, setActiveArea] = useState("Bellville");
  const [radarItems, setRadarItems] = useState<RadarItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

  const refreshFromLocation = async (location: DeviceLocation, background = false) => {
    setCurrentLocation(location);
    setManualOverride(null);
    setActiveArea(location.area);
    setLocationStatus("granted");
    if (background) setBackgroundRefreshing(true);
    try {
      const settings = await loadSettings();
      const remote = await fetchNearbyItems(location, { ...settings, radius });
      setRadarItems(remote);
    } finally {
      if (background) setBackgroundRefreshing(false);
    }
  };

  const useCurrentLocation = async () => {
    const result = await requestApproximateLocation(activeArea);
    if (result.status === "granted") await refreshFromLocation(result.location, true);
    else setLocationStatus("denied");
  };

  const exploreAnotherArea = () => {
    Alert.alert("Explore another area", "Choose a temporary discovery area. Lekka will keep your device location as the default.", [
      ...explorationAreas.map((place) => ({
        text: place.area,
        onPress: () => {
          const next = { ...place, capturedAt: Date.now() };
          setManualOverride(next);
          setCurrentLocation(null);
          setActiveArea(place.area);
          setLocationStatus("manual");
          setBackgroundRefreshing(true);
          void loadSettings()
            .then((settings) => fetchNearbyItems(next, settings, category))
            .then(setRadarItems)
            .finally(() => setBackgroundRefreshing(false));
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  useEffect(() => {
    let active = true;
    let stopWatching: () => void = () => undefined;
    void (async () => {
      const settings = await loadSettings();
      if (!active) return;
      setRadius(settings.radius);
      const result = await getLastKnownOrCurrentLocation(settings.area);
      if (!active) return;
      if (result.status === "granted") {
        await refreshFromLocation(result.location);
        if (active) setInitialLoading(false);
        stopWatching = await watchMeaningfulForegroundLocation((next) => {
          if (active) void refreshFromLocation(next, true);
        }, result.location.area);
      } else {
        setLocationStatus("denied");
        setActiveArea(settings.area);
        const cached = await fetchNearbyItems(undefined, settings);
        if (active) {
          setRadarItems(cached);
          setInitialLoading(false);
        }
      }
    })().catch(() => {
      if (active) {
        setRadarItems([]);
        setInitialLoading(false);
      }
    });
    return () => {
      active = false;
      stopWatching();
    };
  }, []);

  const setDiscoveryRadius = (nextRadius: string) => {
    setRadius(nextRadius);
    void loadSettings().then(async (settings) => {
      const nextSettings = { ...settings, radius: nextRadius };
      await saveSettings(nextSettings);
      const queryLocation = currentLocation ?? manualOverride;
      if (queryLocation) {
        const remote = await fetchNearbyItems(queryLocation, nextSettings, category);
        setRadarItems(remote);
      }
    });
  };

  const items = useMemo(
    () => category === "All" ? radarItems : radarItems.filter((item) => item.category === category),
    [category, radarItems],
  );
  const presentation = getFetchPresentation({
    isInitialLoading: initialLoading,
    isRefreshing: backgroundRefreshing,
    hasData: items.length > 0,
  });

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>LOCAL RADAR</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Around {activeArea}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {currentLocation ? "Using your current area; exact coordinates stay private." : "Privacy-safe areas, not exact user locations."}
          </Text>
          <View style={styles.locationActions}>
            <Pressable onPress={useCurrentLocation} style={styles.locationAction}>
              <IconSymbol name="location.fill" size={14} color={colors.primary} />
              <Text style={[styles.locationActionText, { color: colors.primary }]}>
                {locationStatus === "granted" ? "Using current device location" : locationStatus === "denied" ? `Using ${activeArea} manually` : "Use current location"}
              </Text>
            </Pressable>
            <Pressable onPress={exploreAnotherArea} style={styles.locationAction}>
              <Text style={[styles.locationActionText, { color: colors.muted }]}>
                {manualOverride ? "Explore another area" : "Explore elsewhere"}
              </Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={() => setMapView((value) => !value)} style={[styles.viewToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name={mapView ? "list.bullet" : "map.fill"} size={18} color={colors.foreground} />
          <Text style={[styles.toggleText, { color: colors.foreground }]}>{mapView ? "List" : "Map"}</Text>
        </Pressable>
      </View>

      <View style={[styles.mapPreview, { backgroundColor: mapView ? "#DCE8DF" : colors.surface, borderColor: colors.border }]}>
        {mapView ? (
          <View style={styles.mapContent}>
            <View style={styles.mapRoadOne} />
            <View style={styles.mapRoadTwo} />
            <RadarPin x="26%" y="38%" color="#D95D4F" />
            <RadarPin x="56%" y="56%" color="#E9A23B" />
            <RadarPin x="73%" y="27%" color="#2F7D67" />
            <Text style={styles.mapLabel}>Approximate local activity</Text>
          </View>
        ) : (
          <View style={styles.mapContent}>
            <IconSymbol name="location.fill" size={28} color={colors.primary} />
            <Text style={[styles.mapTitle, { color: colors.foreground }]}>See what matters around you</Text>
            <Text style={[styles.mapSub, { color: colors.muted }]}>Switch to Map to explore category markers.</Text>
          </View>
        )}
      </View>

      <Text style={[styles.filterLabel, { color: colors.muted }]}>DISCOVERY RADIUS</Text>
      <FlatList
        data={radiusOptions}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radiusRow}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable onPress={() => setDiscoveryRadius(item)} style={[styles.radius, { borderColor: radius === item ? colors.primary : colors.border, backgroundColor: radius === item ? `${colors.primary}18` : colors.surface }]}>
            <Text style={[styles.radiusText, { color: radius === item ? colors.primary : colors.muted }]}>{item}</Text>
          </Pressable>
        )}
      />

      <Text style={[styles.filterLabel, { color: colors.muted }]}>EXPLORE BY CATEGORY</Text>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCategory(item)} style={[styles.category, { backgroundColor: category === item ? colors.foreground : colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: category === item ? colors.background : colors.muted }]}>{item}</Text>
          </Pressable>
        )}
      />

      <View style={styles.resultRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby now</Text>
        <Text style={[styles.resultMeta, { color: colors.muted }]}>{items.length} results · {radius}</Text>
      </View>

      {presentation === "content-refreshing" ? (
        <View style={[styles.syncPill, { backgroundColor: `${colors.primary}12` }]}>
          <View style={[styles.syncDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.syncText, { color: colors.primary }]}>Refreshing nearby activity</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        renderItem={({ item }) => <RadarCard item={item} colors={colors} />}
        ListEmptyComponent={presentation === "skeleton" ? <NearbySkeletonList /> : <EmptyRadar colors={colors} />}
      />
    </ScreenContainer>
  );
}

function EmptyRadar({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <IconSymbol name="location.fill" size={28} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No live activity nearby</Text>
      <Text style={[styles.emptyText, { color: colors.muted }]}>When local posts, events, and alerts are published in this area, they will appear here.</Text>
    </View>
  );
}

function RadarPin({ x, y, color }: { x: DimensionValue; y: DimensionValue; color: string }) {
  return (
    <View style={[styles.pin, { left: x, top: y, backgroundColor: color }]}>
      <IconSymbol name="location.fill" size={17} color="#FFF" />
    </View>
  );
}

function RadarCard({ item, colors }: { item: RadarItem; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Alert.alert(item.title, `${item.subtitle}\n\n${item.area} · ${item.distance} · ${item.time}`)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.itemIcon, { backgroundColor: `${item.accent}20` }]}>
        <IconSymbol
          name={item.icon === "restaurant" ? "building.2.fill" : item.category === "Alert" ? "exclamationmark.triangle.fill" : item.category === "Event" ? "calendar" : item.category === "Job" ? "briefcase.fill" : item.category === "Marketplace" ? "cart.fill" : "tag.fill"}
          size={22}
          color={item.accent}
        />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </View>
        <Text style={[styles.cardSub, { color: colors.muted }]}>{item.subtitle}</Text>
        <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.area} · {item.distance} · {item.time}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 17 },
  titleCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  locationActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 9 },
  locationAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  locationActionText: { fontSize: 11, fontWeight: "700" },
  viewToggle: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9 },
  toggleText: { fontSize: 12, fontWeight: "700" },
  mapPreview: { height: 190, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  mapContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapTitle: { marginTop: 10, fontSize: 16, fontWeight: "800" },
  mapSub: { marginTop: 5, fontSize: 12 },
  mapRoadOne: { position: "absolute", width: "120%", height: 14, backgroundColor: "#FFFFFF88", transform: [{ rotate: "22deg" }] },
  mapRoadTwo: { position: "absolute", width: "120%", height: 10, backgroundColor: "#FFFFFF88", transform: [{ rotate: "-34deg" }] },
  mapLabel: { position: "absolute", bottom: 13, fontSize: 11, color: "#426154", fontWeight: "700" },
  pin: { position: "absolute", width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFFFFF" },
  filterLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 20 },
  radiusRow: { gap: 7, paddingTop: 9 },
  radius: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  radiusText: { fontSize: 12, fontWeight: "700" },
  categoryRow: { gap: 7, paddingTop: 9 },
  category: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  categoryText: { fontSize: 12, fontWeight: "700" },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  resultMeta: { fontSize: 12 },
  syncPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 11, fontWeight: "700" },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 24, alignItems: "center", gap: 8, marginTop: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  itemIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardCopy: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardSub: { fontSize: 13, marginTop: 3 },
  cardMeta: { fontSize: 11, marginTop: 8 },
});
