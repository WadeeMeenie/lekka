import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { ThemePalettes, type ColorScheme, type ThemeId } from "@/constants/theme";

const THEME_KEY = "lekka/theme/v1";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [themeId, setThemeIdState] = useState<ThemeId>("original");

  useEffect(() => {
    void AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value && value in ThemePalettes) setThemeIdState(value as ThemeId);
    });
  }, []);

  const applyTheme = useCallback((scheme: ColorScheme, selectedTheme: ThemeId) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.dataset.lekkaTheme = selectedTheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = ThemePalettes[selectedTheme][scheme];
      Object.entries(palette).forEach(([token, value]) => root.style.setProperty(`--color-${token}`, value));
    }
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => setColorSchemeState(scheme), []);
  const setThemeId = useCallback((nextTheme: ThemeId) => {
    setThemeIdState(nextTheme);
    void AsyncStorage.setItem(THEME_KEY, nextTheme);
  }, []);

  useEffect(() => {
    applyTheme(colorScheme, themeId);
  }, [applyTheme, colorScheme, themeId]);

  const themeVariables = useMemo(() => {
    const palette = ThemePalettes[themeId][colorScheme];
    return vars({
      "color-primary": palette.primary,
      "color-background": palette.background,
      "color-surface": palette.surface,
      "color-foreground": palette.foreground,
      "color-muted": palette.muted,
      "color-border": palette.border,
      "color-success": palette.success,
      "color-warning": palette.warning,
      "color-error": palette.error,
    });
  }, [colorScheme, themeId]);

  const value = useMemo(() => ({ colorScheme, setColorScheme, themeId, setThemeId }), [colorScheme, setColorScheme, setThemeId, themeId]);

  return <ThemeContext.Provider value={value}><View style={[{ flex: 1 }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
