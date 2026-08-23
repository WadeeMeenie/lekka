# Lekka Feed Ranking

Lekka's Home feed uses an explainable EdgeRank-style score rather than naive chronology.

`score = (Affinity × W1) + (Content Weight × W2) + (Decay × W3)`

Runtime tuning lives in `public.feed_rank_config`; the TypeScript defaults are documented in `lib/feed-ranking-config.ts`.

## Factors

- **Affinity (0–1):** recent reactions/comments, follow relationship, and optional profile visits. Cached in `feed_affinity_scores` and refreshed on interaction or batch.
- **Content Weight (0–1):** logarithmic engagement, with comments > shares > reactions > views and a small media multiplier.
- **Decay (0–1):** exponential decay with a tunable half-life; default is 5 hours.
- **Randomization:** deterministic ±5% jitter for a refresh seed so pagination remains stable while refreshes can vary.
- **Diversity:** no author can occupy more than two of the top ten ranked slots.

Every returned post is logged in `feed_score_log` with the factor values, configured weights, random factor, raw score and final score.

If the ranking RPC is unavailable or errors, the client falls back to chronological feed ordering. The fallback is intentionally fail-open so the Home feed never becomes unusable because ranking is unavailable.

## Performance

Ranking is set-based SQL. It calculates aggregates per candidate post rather than issuing one query per post/user. Affinity is cached and does not need to be recalculated during every feed load. The expected development target is at least 1,000 candidate posts × 100 users without an N+1 feed-load pattern.
