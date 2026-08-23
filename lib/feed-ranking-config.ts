/**
 * Explainable feed-ranking defaults. Runtime tuning lives in Supabase
 * public.feed_rank_config so weights can be changed without shipping code.
 */
export const FEED_RANKING_CONFIG = {
  weights: { affinity: 0.45, weight: 0.35, decay: 0.20 },
  halfLifeHours: 5,
  randomizationPct: 0.05,
  maxAuthorSlotsInTop10: 2,
  interactionWeights: {
    comment: 3,
    share: 2,
    reaction: 1,
    view: 0.25,
  },
  mediaMultiplier: 1.10,
  engagementLogBase: 2,
} as const;
