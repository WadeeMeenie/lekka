import { Tabs } from "expo-router";
import { Platform } from "react-native";
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
          height: 58 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="nearby" options={{ title: "Radar", tabBarIcon: ({ color }) => <IconSymbol name="location.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: "Create", tabBarIcon: ({ color }) => <IconSymbol name="plus.circle.fill" size={25} color={color} /> }} />
      <Tabs.Screen name="social" options={{ title: "Social", tabBarIcon: ({ color }) => <IconSymbol name="person.2.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="local" options={{ title: "Local", tabBarIcon: ({ color }) => <IconSymbol name="building.2.fill" size={23} color={color} /> }} />
    </Tabs>
  );
}
