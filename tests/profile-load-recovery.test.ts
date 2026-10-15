import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("profile editor protects saved data on load failure", () => {
  const screen = readFileSync(resolve(process.cwd(), "app/profile.tsx"), "utf8");

  it("offers a retry when the saved profile cannot be loaded", () => {
    expect(screen).toContain("setProfileLoadAttempt((attempt) => attempt + 1)");
    expect(screen).toContain('accessibilityLabel="Retry loading saved profile"');
    expect(screen).toContain("Retry before saving");
  });

  it("blocks saving while the existing profile is loading or failed to load", () => {
    expect(screen).toContain("if (loading || loadError)");
    expect(screen).toContain("disabled={busy || loading || Boolean(loadError) || !user}");
  });
});
