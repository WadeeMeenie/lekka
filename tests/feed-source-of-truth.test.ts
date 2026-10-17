import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("feed source-of-truth behavior", () => {
  it("does not ship demo feed rows or fabricated client-side ranking", () => {
    const radar = read("lib/local-radar.ts");
    expect(radar).not.toContain("seededPosts");
    expect(radar).not.toContain("seededRadar");
    expect(radar).not.toContain("rankPosts");
    expect(radar).not.toContain("FeedTab");
  });

  it("returns real feed errors instead of presenting cached data as current", () => {
    const repository = read("lib/supabase-repository.ts");
    expect(repository).toContain("error: { message: string } | null");
    expect(repository).toContain("Please sign in to load your feed");
    expect(repository).not.toContain("const cached = await loadPosts()");
    expect(repository).not.toContain("savePosts(posts)");
  });

  it("uses the saved area when approximate device location is unavailable", () => {
    const repository = read("lib/supabase-repository.ts");
    const home = read("app/(tabs)/index.tsx");
    expect(repository).toContain(".ilike(\"area\", \"%\" + normalizedArea + \"%\")");
    expect(repository).toContain("Choose an area or allow approximate location");
    expect(home).toContain("settings.area");
    expect(home).toContain('accessibilityLabel="Change local area in Explore"');
  });

  it("does not expose unsupported Trending or Following feed modes", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).not.toContain("Trending");
    expect(home).not.toContain("Following");
    expect(home).toContain("feedErrorCopy(firstPage.error)");
  });
});
