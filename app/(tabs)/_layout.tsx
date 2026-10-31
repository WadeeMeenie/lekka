import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 66 + bottomPadding,
          paddingTop: 9,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 3 },
        tabBarItemStyle: { minHeight: 50 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home tab", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="nearby" options={{ title: "Explore", tabBarAccessibilityLabel: "Explore nearby posts and places", tabBarIcon: ({ color }) => <IconSymbol name="location.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: "Create", tabBarAccessibilityLabel: "Create tab", tabBarIcon: () => <View style={{ width: 46, height: 46, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: -12, elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}><IconSymbol name="plus" size={24} color={colors.background} /></View> }} />
      <Tabs.Screen name="social" options={{ title: "Communities", tabBarAccessibilityLabel: "Communities tab", tabBarIcon: ({ color }) => <IconSymbol name="person.2.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: "Inbox", tabBarAccessibilityLabel: "Inbox and direct messages", tabBarIcon: ({ color }) => <IconSymbol name="message.fill" size={22} color={color} /> }} />
      <Tabs.Screen name="local" options={{ href: null }} />
    </Tabs>
  );
}
