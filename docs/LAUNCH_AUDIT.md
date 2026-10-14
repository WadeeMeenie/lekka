# Launch issue register — 14 October 2026

This is an initial source and local-execution audit. It does not claim the entire live schema, every page or all workflows have been verified.

| ID / severity | Reproduction, affected area and root cause | Fix / verification / state |
|---|---|---|
| L01 High | Concurrent outbox enqueue/sync; `lib/offline-outbox.ts` performs unlocked read-modify-write. Test loses draft, creates post twice, or retains completed draft. | Serialize per-owner mutations. Three regression failures reproduced before fix; all four tests pass after. Fixed within one JS runtime; multi-tab/process/crash idempotency remains open. |
| L02 High | Web build on clean checkout: missing react-native-web; pnpm isolated linker cannot resolve CSS runtime. No tracked lock. | Add SDK-compatible web dependencies, explicit Babel parser, pnpm hoisted config, lockfile and frozen install/web CI gate. Build status in test report. |
| L03 High | Web media upload calls native File.bytes; installed Expo web implementation lacks that method. | Browser fetch/arrayBuffer reader and native path preserved; three tests pass. Real Storage upload and avatar persistence BLOCKED. |
| L04 High | `app/(tabs)/create.tsx`: choosing My community or My followers maps to nearby without membership/follower audience. | Source-confirmed privacy mismatch. Restrict general composer to supported audiences and retain dedicated community workflow; runtime authorization still requires backend tests. |
| L05 High | Composer creates post, media fails, catch queues a draft without the created post ID. Outbox retry can also re-upload existing object after attach failure. | Open: implement durable publication checkpoints and server idempotency in a reconciled staging schema; reproduce full upload failure/retry journey. |
| L06 High | Outbox passes ownerId, but createPost re-reads current session and inserts that user's ID. Account change during retry could reauthor a stale draft. | Open: bind expected author through creation and media operations; test A→B switch during each await and enforce server ownership. |
| L07 High | Nine duplicated migration version prefixes; historical docs warn deployed versions differ. | BLOCKED on live history. Reconcile schema/grants/policies/functions/Storage/Edge versions before migration replay. Never blindly rename old migrations. |
| L08 High | Privacy notice, terms, account deletion and support process not found as dedicated app routes. | Open: obtain operator/retention/contact facts and legal review; implement operational and in-product workflows with authorization tests. |
| L09 Medium | Auth layout is a non-scrolling flex View; signup requirements/feedback may exceed small screens or keyboard area. Inputs rely on placeholders. | Open pending visual reproduction; add scrolling/keyboard avoidance, persistent labels and focus checks. |
| L10 Medium | `lib/messaging.ts` loads first 200 messages ascending and unbounded conversations. | Open: verify latest-message visibility, cursor pagination and indexes with staging history. |
| L11 Medium | `lib/location.ts` explicitly returns unavailable on web; manual geocode support also needs platform verification. | Open: establish supported web location/manual-area behavior, denial and timeout tests. |
| L12 Medium | 14 Expo lint warnings, including stale-effect dependency risks in nearby/messages. | Open: reproduce stale state and cleanup behaviors before changing effect dependencies. |

## Historical defects

All nine reported historical failures remain **BLOCKED for live reproduction**, not fixed by assertion: post permission/is_businessmanager, communities loading, local discovery, likes/profiles permission, avatar display, profile save, community create, sharing, navigation/error states. Latest baseline commit already contains targeted repairs; tests/production-regressions.test.ts checks source strings, not those operations against PostgreSQL. Need representative accounts and deployed catalog before attributing current root causes.

## Route review scope

All route paths are inventoried in `LAUNCH_ROUTES.md`. Static findings above are triage, not visual passes. Shared identity: existing Lekka colours, typography and tab structure retained. No generic template replacement.

## Security scope

No privileged key was requested or inserted. Current client configuration uses a publishable key. Full repository-history secret scanning, live grants, function owners/search paths, Storage policies, effective RLS, advisors and Edge deployment comparison are NOT TESTED/BLOCKED. Existing release docs mention PostGIS grants and leaked-password protection; these are unresolved historical findings until rechecked, not newly verified vulnerabilities.

## Candidate resolution update

L04: general composer now offers only Nearby/Public, its supported visibility modes. Community creation/posting routes remain. L05: composer now retains created post ID/storage path/upload completion on failure; outbox skips an acknowledged completed upload on attachment retry. New retry test failed before fix and passes after. Lost server acknowledgements, process crashes and cross-tab idempotency remain OPEN. L06: createPost now rejects draft owner/session mismatch and binds the inserted author; three service tests pass (denial reproduced before fix). Mid-operation Storage/RLS isolation still requires live verification. L09: reproduced clipped signup and unreadable headings in browser; auth scrolling/width/labels and shared palette/background repaired, visually verified at 390x667 and 1280x800. Theme context now drives selected theme colours. Removed stale nonexistent oauth/callback stack registration after export warning.

