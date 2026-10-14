import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("theme source of truth", () => {
  it("resolves screen colors from the central ThemeProvider and selected palette", () => {
    const hook = read("hooks/use-colors.ts");
    const provider = read("lib/theme-provider.tsx");

    expect(hook).toContain('import { useThemeContext } from "@/lib/theme-provider"');
    expect(hook).toContain("ThemePalettes[themeId][scheme]");
    expect(hook).not.toContain('from "./use-color-scheme"');
    expect(provider).toContain("const ThemeContext = createContext<ThemeContextValue | null>(null)");
  });
});
