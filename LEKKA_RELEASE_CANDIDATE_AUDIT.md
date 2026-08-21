# Lekka Release Candidate Audit

**Audit scope:** consistency, installability, security posture, privacy, implemented Social Core, performance risks, and release readiness.  
**Baseline source commit:** `cd1afb906184b2cbe9e2326fa6006a72ef71e33e` on `main`.  
**Audit rule:** source implementation is not treated as runtime verification.

> **Executive verdict: READY FOR INTERNAL TESTING, NOT READY FOR PUBLIC BETA OR PRODUCTION.** The release candidate is internally coherent and the APK is installable in structure and metadata, but two-account authorization, private-storage isolation, physical-device UX, movement/location behavior, offline kill/reopen, media interruption recovery, and notification actor/recipient flows remain unverified.

## 1. Release-candidate consistency

| Check | Result | Evidence |
|---|---|---|
| Baseline Git commit | PASS | `cd1afb906184b2cbe9e2326fa6006a72ef71e33e` on `main`. |
| Working tree at baseline | PASS | Baseline commit was the last pushed release commit. The current audit session adds only audit tracking/report files locally. |
| Package | PASS | `app.config.ts` resolves Android package `com.app.localradarsa`; APK manifest matches. |
| App name | PASS | `app.config.ts` and APK label are `Lekka`. |
| Version | PASS | `1.0.0` in config and APK manifest. |
| Supabase configuration | PASS / LIMITED | Client reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no service-role handling is present in the client. Live two-account use is unavailable. |
| Native configuration | PASS | Native Android project and Gradle release path are present; arm64 build completed. |
| Database source | PASS / PARTIAL | Core, location, Social Core, lockdown, cursor, and moderation migrations are tracked. Remote migration application was previously recorded; this audit did not alter the database. |
| Storage source | PASS / NOT RUNTIME VERIFIED | Private `local-radar-media` bucket and account-folder policies are defined. Cross-account access was not tested with two sessions. |

The release APK was rebuilt from the same source/native state and produced the exact recorded SHA-256, so the current artifact-to-baseline mapping is **verified for this pipeline run**. This is not a general claim that all future builds are byte-for-byte reproducible.

## 2. APK verification

| Property | Result |
|---|---|
| File | `/home/ubuntu/Downloads/app-release.apk` |
| Size | 37,740,643 bytes |
| ZIP integrity | PASS — `unzip -tq` reported no errors |
| SHA-256 | `4f6f874f15fe0ebcd16d20332664a0121c709afdb73a2a9659a4326ac6155b1a` |
| Expected SHA-256 | Exact match |
| Package | `com.app.localradarsa` |
| Application label | `Lekka` |
| Version | `1.0.0` |
| ABI | `arm64-v8a` only; 22 native libraries found under that ABI |
| Native runtime | Hermes, React Native, Expo modules, Reanimated, screens, SVG, worklets, and image libraries are bundled |
| Physical installation | NOT TESTED — `adb devices` returned no attached device |

The manifest contains location, camera, microphone, notification, storage, audio, wake-lock, and related Expo/library permissions. This is a release-risk area: some permissions are library-driven and broader than the minimum explicitly described product flow. Their necessity and runtime prompts should be checked on a physical device before public distribution.

## 3. Secret and GitHub hygiene

**SECRET AUDIT: PASS for committed source patterns.** No service-role key, private key, password assignment, signing credential, APK binary, keystore, or certificate is tracked in Git. The local `android/app/debug.keystore` exists as standard development material but is not tracked. No temporary test accounts were found or committed. The Android client is configured around a publishable Supabase key architecture.

The baseline source-to-release hygiene is good, but the current working tree is not clean during this audit because this report and audit TODO entries are local audit artifacts. No application source or database migration was changed by the audit.

## 4. Supabase application schema and RLS audit

| Table | Purpose | RLS | Policy summary | Audit finding |
|---|---|---:|---|---|
| `profiles` | User identity, interests, area, location preference | Enabled | Public read; self update | Public profile fields are intentionally readable; exact location is a sensitive field and must remain excluded from public projections. |
| `follows` | Follower relationships | Enabled | Public read; follower-owned writes | Cross-user mutation should be A/B-tested, not inferred from client gates. |
| `communities` | Community directory | Enabled | Public or member read; creator-owned write | Private membership visibility needs A/B testing. |
| `community_members` | Membership | Enabled | Public read; member-owned writes | Public read may reveal private community membership; review before private communities launch. |
| `businesses` | Local businesses | Enabled | Public read; owner-owned writes | Verification/admin workflow is not present in Social Core. |
| `posts` | Feed and local content | Enabled | Public/public-nearby read; author-owned insert/update/delete | `nearby` posts are readable to any authenticated user by policy; intended privacy scope should be confirmed. |
| `post_media` | Post-to-storage associations | Enabled | Public read; post-author-owned writes | Storage is private, but association rows reveal storage paths to readers; signed URL enforcement should be tested. |
| `comments` | Post comments | Enabled | Public read; author-owned writes | Cross-account delete/update attacks remain untested. |
| `reactions` | One reaction per user/post | Enabled | Public read; user-owned writes | Ownership appears constrained by `user_id`; adversarial mutation remains untested. |
| `saved_posts` | Private saves | Enabled | User-owned all operations | Strongest privacy boundary in source; still requires a real second-session test. |
| `reports` | User reports | Enabled | Self-create and self-read after moderation migration | No moderation review queue exists; report targeting is implemented in client/repository but needs A/B verification. |
| `blocks` | User blocks | Enabled | Blocker-owned all operations | Blocked-user filtering is not uniformly proven across all server queries. |
| `notifications` | User activity | Enabled | Recipient-owned read/update | Server-generated trigger path and dedupe exist; recipient/actor isolation is not end-to-end tested. |

Two material policy risks remain. First, the core migration defines `post_media` public select even though the storage bucket is private; the effective exposure of raw `storage_path` metadata and signed media access must be tested. Second, `community_members` has a public read policy even for private communities. Neither was changed during this audit because the brief prohibits unreviewed schema changes; both are release-gating review items.

## 5. Storage audit

The `local-radar-media` bucket is configured private. Upload, update, and delete policies require an authenticated user whose ID is the first folder component of the object path. The client uses signed URLs for post-media display. This is a sound account-folder pattern at source level, but **cross-account read, update, delete, and path-guessing behavior are NOT TESTED**. No claim of storage security beyond policy inspection is made.

## 6. Location privacy audit

The location engine requests foreground permission only and uses balanced accuracy with a 500 m movement threshold and a two-minute interval for meaningful foreground refresh. Manual exploration is represented separately from current location in the app flow, and a return-to-current path exists architecturally. Public post detail uses an area label and approximate-location wording rather than exact coordinates. No location-history table or background location permission is present in the inspected app configuration.

The primary privacy limitation is verification: actual device permission denial, movement, reverse-geocoding, manual override, return-to-current, and exact-coordinate non-exposure were not tested on hardware. The cursor RPC receives coordinates and computes distance server-side, so logs, error paths, and future analytics must not expose raw inputs.

## 7. Offline account isolation

The outbox key is `lekka/outbox/posts/{ownerId}/v1`. Drafts include `ownerId`, optional post/media IDs, deterministic storage paths, retry count, and last error. Synchronization requires the current authenticated user and loads only that user’s key. This is a strong static design for preventing User B from reading User A’s drafts.

Nevertheless, stale AsyncStorage data, logout/login races, app termination during upload, and whether a queued request can ever run against a different session require a device test. **OFFLINE ACCOUNT ISOLATION: REQUIRES DEVICE TEST.**

## 8. Social Core audit

| Feature | UI | Backend | Database/RLS | Error handling | Offline | Status |
|---|---:|---:|---:|---:|---:|---|
| Post detail | Yes | Yes | Yes | Yes | Cached/read fallback limited | Implemented, not device verified |
| Comments | Yes | Yes | Yes | Yes | No offline comment queue | Implemented, not A/B verified |
| Reactions | Yes | Yes | Yes | Yes | No offline reaction queue | Implemented, not A/B verified |
| Saves | Yes | Yes | Yes | Yes | No offline save queue | Implemented, not A/B verified |
| Public profiles | Yes | Yes | Yes | Yes | Read cache limited | Implemented, not device verified |
| Follow | Yes | Yes | Yes | Yes | No offline follow queue | Implemented, not A/B verified |
| Notifications | Yes | Yes/triggers | Yes/dedupe | Yes | No offline notification queue | Implemented, not actor/recipient verified |
| Photo posting | Yes | Yes/storage | Yes | Partial retry | Account-scoped draft | Implemented, media interruption not tested |
| Guest gates | Yes | Auth boundary | N/A | Yes | Guest browsing preserved | Implemented, not device verified |

## 9. Feed and performance audit

Home feed pagination uses a `(created_at,id)` cursor and duplicate-free merge helper. The location-aware RPC filters by PostGIS radius, bounds page size to 50, and returns a stable descending order. Public-profile posts are also paginated. Refresh resets pagination, load-more is bounded, and empty/cached states exist.

At 10,000 posts, the indexed created-at and GiST location paths should be reasonable but correlated subqueries for reaction/comment counts may become noticeable. At 100,000 posts, count subqueries, profile joins, and per-page signed media work need query-plan and payload measurements. At 1,000,000 posts, the feed RPC should be benchmarked with `EXPLAIN ANALYZE`, likely replacing per-row count subqueries with maintained counters or pre-aggregated views. No premature optimization was applied.

Images are the highest client-side risk: signed media URLs, large photos, and unbounded post-card image dimensions can increase memory and bandwidth on budget Android devices. No FPS, scroll, memory, or network benchmark was run on a Samsung S23 FE, mid-range, or budget handset.

## 10. Media audit

The flow creates the post before upload, stores deterministic owner-scoped paths, associates media after upload, and preserves retry drafts on upload/association failure. This avoids silent failure and supports retry. Remaining risks are orphaned media after a post succeeds but association fails, large uncompressed source images, slow-network timeouts, and the possibility of a user retrying from a stale UI state. Duplicate prevention is strong for queued post IDs but not proven through app termination during upload.

## 11. UX audit

The primary navigation is coherent and uses back navigation on post detail, public profile, notifications, and saved content. The strongest user-facing gaps are not cosmetic: some Social/Local categories remain directory or capability surfaces rather than complete end-to-end workflows; guest gates can interrupt expected actions; error copy is generic in a few network paths; media retry needs a clearer progress/cancel experience; settings/privacy controls are not a full dedicated surface; and notification unread state has not been observed across restart.

The onboarding communicates “what’s happening around you” clearly. South African locality is visible through Bellville-first defaults, area labels, and local terminology, but the product still needs real populated local content to feel authentically South African rather than merely location-aware.

## 12. Conservative scorecard

| Area | Score / 10 | Reason |
|---|---:|---|
| UX | 7 | Coherent onboarding, loading, empty, and guest states; several incomplete capability surfaces remain. |
| Authentication | 7 | Supabase password auth and protected actions exist; no two-account flow was executed. |
| Location | 7 | Privacy-aware foreground architecture; no physical movement evidence. |
| Radar | 6 | Location-aware queries and filters exist; populated real-world behavior is unverified. |
| Social | 7 | Core interactions and notifications are implemented; moderation and cross-account behavior are not proven. |
| Security | 6 | RLS/storage boundaries are substantial, with public membership/media metadata concerns and no A/B attacks. |
| Offline | 6 | Account-scoped outbox is thoughtful; kill/reopen/session-switch behavior is untested. |
| Media | 5 | Authenticated upload and retry drafts exist; cleanup, compression, and interruption handling are partial. |
| Performance | 5 | Pagination and indexes exist; no device/query-plan/large-scale measurements. |
| South African relevance | 6 | Bellville and area language are present; authentic local content and coverage are unverified. |
| Backend architecture | 7 | Supabase/PostGIS/RLS/realtime separation is a strong foundation. |
| Production readiness | 4 | Release artifact is valid, but key real-world and security evidence is missing. |

**OVERALL SCORE: 73/100** as an engineering release candidate; this is not a production-readiness percentage.

## 13. Release status

**READY FOR INTERNAL TESTING.** It is not ready for public beta or production because two-account RLS/storage validation, physical Android testing, movement/location validation, offline account-switch testing, notification actor/recipient testing, and media interruption testing remain unverified. No seed data was created and no database change was made by this audit.

## Top 10 remaining problems

| Priority | Problem |
|---:|---|
| 1 | No confirmed two-account Supabase session for RLS/IDOR testing. |
| 2 | No physical Android device for installation and end-to-end UX testing. |
| 3 | Private storage isolation and signed-media behavior are policy-inspected but not adversarially tested. |
| 4 | Public `community_members` read policy may expose private-community membership. |
| 5 | `post_media` association rows are publicly readable despite a private bucket. |
| 6 | Media orphan cleanup after post/media association failure is incomplete. |
| 7 | Offline drafts and queued uploads have not been tested across kill/reopen and account switching. |
| 8 | Feed count subqueries and media payloads lack query-plan and low-end performance evidence. |
| 9 | Moderation has report/block primitives but no review workflow or proven blocked-content filtering everywhere. |
| 10 | Local categories and some settings remain incomplete or capability-oriented rather than fully verified product flows. |

## Top 10 highest-value next improvements

| Priority | Improvement |
|---:|---|
| 1 | Execute the two-account RLS and storage attack matrix with temporary confirmed accounts. |
| 2 | Install on one physical Android handset and run the complete onboarding, location, Social Core, offline, and reconnect runbook. |
| 3 | Re-evaluate private-community membership and post-media association policies before broader testing. |
| 4 | Add media compression/resizing and explicit retry/cancel progress UI. |
| 5 | Add reliable orphan-media cleanup or a server-side reconciliation job. |
| 6 | Benchmark the feed RPC and count strategy at representative row counts. |
| 7 | Add end-to-end tests for notification creation, deduplication, read state, and target navigation. |
| 8 | Add blocked-user filtering to every relevant feed, profile, comment, and notification query. |
| 9 | Complete the smallest missing user flows: settings/privacy, report confirmation, and profile post states. |
| 10 | Populate a controlled, authenticated test dataset only after the security matrix is complete.

## References

[1]: https://github.com/WadeeMeenie/lekka/tree/cd1afb906184b2cbe9e2326fa6006a72ef71e33e "Lekka source at audited release commit"

[2]: https://github.com/WadeeMeenie/lekka/blob/cd1afb906184b2cbe9e2326fa6006a72ef71e33e/app.config.ts "Lekka Expo configuration"

[3]: https://github.com/WadeeMeenie/lekka/blob/cd1afb906184b2cbe9e2326fa6006a72ef71e33e/supabase/migrations/202608200001_local_radar_core.sql "Lekka core schema and RLS migration"

[4]: https://github.com/WadeeMeenie/lekka/blob/cd1afb906184b2cbe9e2326fa6006a72ef71e33e/lib/location.ts "Lekka foreground location engine"

[5]: https://github.com/WadeeMeenie/lekka/blob/cd1afb906184b2cbe9e2326fa6006a72ef71e33e/lib/offline-outbox.ts "Lekka account-scoped offline outbox"

[6]: https://github.com/WadeeMeenie/lekka/blob/cd1afb906184b2cbe9e2326fa6006a72ef71e33e/lib/social-repository.ts "Lekka Social Core repository"
