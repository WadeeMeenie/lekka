import { ThemePalettes, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useThemeContext } from "@/lib/theme-provider";

/**
 * The ThemeProvider is the single source of truth for theme selection and mode.
 * Every screen must resolve colors through this hook so selected brand palettes
 * work consistently on native and web instead of silently falling back to the
 * original system palette.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const { colorScheme, themeId } = useThemeContext();
  const scheme = colorSchemeOverride ?? colorScheme;
  return ThemePalettes[themeId][scheme] as ThemeColorPalette;
}
