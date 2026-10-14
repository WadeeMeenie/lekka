import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("settings information architecture", () => {
  const settings = readFileSync(resolve(process.cwd(), "app/settings.tsx"), "utf8");
  const menu = readFileSync(resolve(process.cwd(), "app/menu.tsx"), "utf8");

  it("uses one settings entry point from the menu", () => {
    expect(menu).toContain('title: "Settings"');
    expect(menu).toContain('route: "/settings"');
    expect(menu).not.toContain('title: "Account settings"');
  });

  it("groups real settings destinations without inventing local preference toggles", () => {
    for (const route of ["/profile", "/account-settings", "/personal-details", "/notifications", "/saved", "/(tabs)/nearby", "/business-profiles", "/feedback"]) {
      expect(settings).toContain(route);
    }
    expect(settings).toContain("requiresAuth");
    expect(settings).toContain("router.push(item.route");
    expect(settings).not.toContain("<Switch");
  });

  it("keeps settings rows compact and accessible", () => {
    expect(settings).toContain('accessibilityRole="button"');
    expect(settings).toContain("minHeight: 68");
    expect(settings).toContain("StyleSheet.hairlineWidth");
  });
});
