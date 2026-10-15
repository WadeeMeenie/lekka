import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public profile recoverability", () => {
  const screen = readFileSync(resolve(process.cwd(), "app/public-profile/[id].tsx"), "utf8");

  it("shows an actionable retry when the profile cannot load", () => {
    expect(screen).toContain("setLoadError(null)");
    expect(screen).toContain("setReloadKey((current) => current + 1)");
    expect(screen).toContain('accessibilityLabel="Retry loading profile"');
    expect(screen).toContain("Couldn’t load this profile");
  });

  it("handles initial and paginated post-load failures without unhandled rejections", () => {
    expect(screen).toContain("if (postsResult.error)");
    expect(screen).toContain("if (page.error)");
    expect(screen).toContain("catch { setPostsError");
    expect(screen).toContain('accessibilityLabel="Retry loading profile posts"');
  });
});
