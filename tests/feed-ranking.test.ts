import { describe, expect, it } from "vitest";
import { FEED_RANKING_CONFIG } from "@/lib/feed-ranking-config";

describe("explainable feed ranking configuration", () => {
  it("uses normalized ranking weights", () => {
    const { affinity, weight, decay } = FEED_RANKING_CONFIG.weights;
    expect(affinity + weight + decay).toBeCloseTo(1, 6);
    expect(affinity).toBeGreaterThan(weight);
    expect(weight).toBeGreaterThan(decay);
  });

  it("keeps the ranking tunables within safe bounds", () => {
    expect(FEED_RANKING_CONFIG.halfLifeHours).toBeGreaterThan(0);
    expect(FEED_RANKING_CONFIG.randomizationPct).toBeGreaterThanOrEqual(0);
    expect(FEED_RANKING_CONFIG.randomizationPct).toBeLessThanOrEqual(0.05);
    expect(FEED_RANKING_CONFIG.maxAuthorSlotsInTop10).toBe(2);
    expect(FEED_RANKING_CONFIG.interactionWeights.comment).toBeGreaterThan(FEED_RANKING_CONFIG.interactionWeights.share);
    expect(FEED_RANKING_CONFIG.interactionWeights.share).toBeGreaterThan(FEED_RANKING_CONFIG.interactionWeights.reaction);
  });
});
