import { Platform } from "react-native";

import themeConfig from "@/theme.config";

export type ColorScheme = "light" | "dark";
export type ThemeId = "original" | "midnight" | "sunset" | "ocean" | "sa-vibe" | "neon";

export const ThemeColors = themeConfig.themeColors;

type ThemeColorTokens = typeof ThemeColors;
type ThemeColorName = keyof ThemeColorTokens;
type SchemePalette = Record<ColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = SchemePalette[ColorScheme];

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = { light: {} as SchemePalette["light"], dark: {} as SchemePalette["dark"] };
  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });
  return palette;
}

const original = buildSchemePalette(ThemeColors);

function palette(light: Record<ThemeColorName, string>, dark: Record<ThemeColorName, string>): SchemePalette {
  return { light, dark };
}

export const ThemePalettes: Record<ThemeId, SchemePalette> = {
  original,
  midnight: palette(
    { ...original.light, primary: "#7C9CFF", background: "#EEF1FF", surface: "#FFFFFF", foreground: "#17203A", muted: "#5D6682", border: "#DCE2F2" },
    { ...original.dark, primary: "#9BAEFF", background: "#0E1222", surface: "#171D32", foreground: "#F0F3FF", muted: "#A8B1C9", border: "#303A5C" },
  ),
  sunset: palette(
    { ...original.light, primary: "#E66D45", background: "#FFF7F1", surface: "#FFFFFF", foreground: "#3D2118", muted: "#856A5E", border: "#F0D9CB" },
    { ...original.dark, primary: "#FF9A67", background: "#231411", surface: "#34201B", foreground: "#FFF2EA", muted: "#D2A99A", border: "#5B342A" },
  ),
  ocean: palette(
    { ...original.light, primary: "#117C91", background: "#F0FAFC", surface: "#FFFFFF", foreground: "#102A32", muted: "#5E7981", border: "#CDE5EA" },
    { ...original.dark, primary: "#56C5D5", background: "#0D1D22", surface: "#142D34", foreground: "#E9FBFD", muted: "#9BC1C8", border: "#2D5660" },
  ),
  "sa-vibe": palette(
    { ...original.light, primary: "#B6811D", background: "#FBFAF3", surface: "#FFFFFF", foreground: "#1C2A23", muted: "#6D786E", border: "#DCE1D3" },
    { ...original.dark, primary: "#F1C75B", background: "#171B16", surface: "#232A20", foreground: "#F7F5E9", muted: "#AFB7A8", border: "#414B3C" },
  ),
  neon: palette(
    { ...original.light, primary: "#8A4DFF", background: "#FAF7FF", surface: "#FFFFFF", foreground: "#23143D", muted: "#746985", border: "#E4D9F7" },
    { ...original.dark, primary: "#C08CFF", background: "#171020", surface: "#241735", foreground: "#FBF4FF", muted: "#C0B0CB", border: "#4D3567" },
  ),
};

export const SchemeColors = ThemePalettes.original;

type RuntimePalette = SchemePaletteItem & { text: string; background: string; tint: string; icon: string; tabIconDefault: string; tabIconSelected: string; border: string };

function buildRuntimePalette(scheme: ColorScheme, themeId: ThemeId = "original"): RuntimePalette {
  const base = ThemePalettes[themeId][scheme];
  return { ...base, text: base.foreground, background: base.background, tint: base.primary, icon: base.muted, tabIconDefault: base.muted, tabIconSelected: base.primary, border: base.border };
}

export const Colors = { light: buildRuntimePalette("light"), dark: buildRuntimePalette("dark") } satisfies Record<ColorScheme, RuntimePalette>;

export type ThemeColorPalette = (typeof Colors)[ColorScheme];

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif", mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
});
