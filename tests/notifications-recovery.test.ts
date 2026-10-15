import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("notifications failure states and navigation", () => {
  const screen = readFileSync(resolve(process.cwd(), "app/notifications.tsx"), "utf8");

  it("does not present a failed notification request as an empty inbox", () => {
    expect(screen).toContain("if (result.error) setError");
    expect(screen).toContain('accessibilityLabel="Retry loading notifications"');
    expect(screen).toContain("setRetryKey((current) => current + 1)");
  });

  it("only marks an item read in the UI after the backend confirms it", () => {
    expect(screen).toContain("if (result.error) setError");
    expect(screen).toContain("else setItems((current) => current.map");
    expect(screen).toContain('item.target_type === "post"');
    expect(screen).toContain('item.target_type === "profile"');
  });
});
