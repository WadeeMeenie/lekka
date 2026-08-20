import { describe, expect, it } from "vitest";
import { rankPosts, seededPosts } from "../lib/local-radar";

describe("Local Radar ranking", () => {
  it("prioritises trusted nearby stories in the default local feed", () => {
    const ranked = rankPosts(seededPosts, "For You");
    expect(ranked[0]?.author).toBe("Bellville Neighbourhood Watch");
  });

  it("keeps alerts prominent in the nearby feed", () => {
    const ranked = rankPosts(seededPosts, "Nearby");
    expect(ranked.some((post) => post.kind === "alert")).toBe(true);
    expect(ranked[0]?.distance).toBe("0.7 km");
  });

  it("surfaces engagement for trending content", () => {
    const ranked = rankPosts(seededPosts, "Trending");
    expect(ranked[0]?.likes).toBeGreaterThanOrEqual(ranked[1]?.likes ?? 0);
  });
});
