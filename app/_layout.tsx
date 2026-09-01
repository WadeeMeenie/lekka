import "@/global.css";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/lib/theme-provider";

export const unstable_settings = { anchor: "(tabs)" };

// Keep the native root deliberately boring. Authentication, onboarding and
// route decisions belong to route screens, not to the provider tree. This
// prevents a backend/local-storage failure from preventing Expo Router from
// mounting the application at all.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 10 }}>Lekka could not start</Text>
      <Text selectable style={{ textAlign: "center", marginBottom: 18 }}>
        {error?.message || "An unexpected startup error occurred."}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "700" }}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="oauth/callback" />
              <Stack.Screen name="reset-password" />
            </Stack>
            <StatusBar style="auto" />
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
