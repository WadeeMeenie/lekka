import { type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { buildRuntimePalette } from "@/lib/_core/theme";
import { useThemeContext } from "@/lib/theme-provider";

/**
 * Returns the current theme's color palette.
 * Usage: const colors = useColors(); then colors.text, colors.background, etc.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const { colorScheme, themeId } = useThemeContext();
  return buildRuntimePalette(colorSchemeOverride ?? colorScheme, themeId);
}
