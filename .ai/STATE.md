# Current state — 14 October 2026

Branch codex/launch-readiness-20261014, draft PR https://github.com/WadeeMeenie/lekka/pull/12. Published cold-export fix ef86720c84da54b02b33bf47a66dd10b7e46712c passed code/tests/web/Expo doctor in CI; Android still pending at last check. Current staging guard edits have local 165 pass / 2 skip and TypeScript pass.

Supabase access RESTORED. Production vnitwsjidlurlwlpsmtf remains read-only under user's explicit staging mission. Read docs/STAGING_READINESS.md for current evidence and provisioning boundary; earlier access-blocked reports are superseded. Critical effective client writes to spatial_ref_sys and high callable PostGIS security-definer grants remain open. Other policy/RPC inconsistencies require isolated reproduction.

No suitable staging exists. User selected WadeeMeenie's Org ezuqyiivnqdvrfsadntr for a quote only. Free plan, two active projects; get_cost tool UNAVAILABLE. No cost/provisioning approval, no project created, no accounts created. Never repurpose payflow-sa/printkings or upgrade/pause projects without authorization. Need account-specific dashboard quote and exact provisioning approval, then verify a new lekka-staging project ref. Approved test email domain/secret store still absent.

Prepared strict production deny guards, staging frontend validation, read-only preflight, environment template, migration audit and 21 guard tests. Migration replay BLOCKED: 84 files, nine duplicate prefixes; live 88 entries, 11 version matches. Do not replay blindly or repair production history. Local metadata-only catalog snapshots are in ../live-catalog.json and ../live-migrations.json. No production mutation, deployment, infrastructure charge, destructive test or secret creation occurred.

Next: resolve quote/provisioning boundary; establish isolated schema and review migration ordering; create synthetic identities only there; execute allow/deny workflow tests. Launch and staging NOT READY.

Review continuation: exact d1c2f61370ab3d4bad1d94ab800797f6e8c26baa CI run 38534568089 code job PASS; Android pending at latest check. Quote retried and still UNAVAILABLE. Read docs/STAGING_REPLAY_REVIEW.md and docs/staging-replay-matrix.json: compared all 84 files and 88 recorded SQL contents; 32 normalized text matches, 35 name-only differences, 3 version-only differences, 14 unmatched local files; 18 unmatched live records. Three migration files route cleanup to production and are prohibited for staging replay. Guard review fixed three reproduced gaps (invalid target, UUID casing, staging-mode mismatch); local 168 pass / 2 skip, TypeScript and changed-file lint pass. No production mutation or provisioning. Original local developer edits preserved; shell HEAD still ef86720.

Final execution directive: no upgrades, paid projects or production modifications. dd13efc2e15f2610d433d86db9b8c322c1bd8872 CI completed SUCCESS. Added TESTING.md with zero-cost Windows UI/testing commands and scripts/test-local.mjs using the existing Vitest config through native Node loading. Verified 168 passed / 2 skipped, TypeScript, both static audits, changed-file lint and production web export (40 routes). Configured Expo lint: 0 errors / 14 warnings. A broader eslint-dot diagnostic also examined non-Expo Deno/k6 files and reported unsupported resolver/global errors; it is not the configured lint gate. Do not suppress these by weakening rules.

Remaining blocker is isolated database verification: Docker and Supabase CLI absent, no safe test database; nine duplicate prefixes, production-bound cron SQL and unresolved schema drift prohibit blind replay. Do not ask for paid staging or retry cost quotes. TESTING.md is the user entry point. No database changes, provisioning, paid actions or deployments performed. Final commit CI must be checked separately.


## Source-of-truth cleanup — 14 October 2026
- Added `.ai/SOURCE_OF_TRUTH.md`; Supabase is the authority for user-generated content. AsyncStorage is only for preferences and explicit offline drafts.
- Removed nine superseded root audit/release snapshots; git history retains them. Do not use old snapshots as current instructions.
- Removed hardcoded sample feed posts/businesses and fake client-side distance/trust/engagement ranking.
- Home feed no longer falls back to local cached content when Supabase is missing, the session is invalid, or the backend query fails. Feed errors are returned and surfaced to the user.
- Removed unsupported Trending/Following controls until real server-side queries exist; the active home feed uses the Supabase-backed nearby/latest query.
- Removed unused duplicate social repository implementations for post detail/comments/reaction/saved/follow actions. Public profile now uses the shared atomic follow RPC.
- Updated feed tests to use explicit fixtures rather than fabricated sample users/posts.
- Candidate code head currently includes the above changes; CI must be checked on the final head before treating it as validated.
- Live read-only checks confirmed the expected profile/community/reaction/discovery RPCs exist, but the live production migration history is behind the candidate migrations. Production remains read-only by instruction; do not apply migrations there.
- Live permissions still need remediation in the authorized isolated staging/owner path: community helper RPCs remain executable by anon; PostGIS extent RPCs remain executable by clients; `spatial_ref_sys` owner restriction persists. The current app cannot be called end-to-end verified until an isolated database and authenticated cross-account tests pass.
