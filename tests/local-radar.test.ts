import { describe, expect, it } from "vitest";
import { personalizeFeed, rankPosts, seededPosts } from "../lib/local-radar";

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

  it("hides not-interesting posts and prioritizes interesting local stories", () => {
    const personalized = personalizeFeed(seededPosts, "For You", { p2: "not_interested", p3: "interested" });
    expect(personalized.map((post) => post.id)).not.toContain("p2");
    expect(personalized[0]?.id).toBe("p3");
  });
});
