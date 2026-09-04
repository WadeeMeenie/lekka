import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 62 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarItemStyle: { minHeight: 48 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home tab", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="nearby" options={{ title: "Radar", tabBarAccessibilityLabel: "Radar tab", tabBarIcon: ({ color }) => <IconSymbol name="location.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: "Create", tabBarAccessibilityLabel: "Create tab", tabBarIcon: () => <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: -8 }}><IconSymbol name="plus" size={22} color={colors.background} /></View> }} />
      <Tabs.Screen name="social" options={{ title: "Social", tabBarAccessibilityLabel: "Social tab", tabBarIcon: ({ color }) => <IconSymbol name="person.2.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="local" options={{ title: "Local", tabBarAccessibilityLabel: "Local tab", tabBarIcon: ({ color }) => <IconSymbol name="building.2.fill" size={22} color={color} /> }} />
    </Tabs>
  );
}
