# Lekka Social Core V1 Production Validation

**Validation date:** 2026-08-21  
**Source commit:** `f2e6727`  
**GitHub:** https://github.com/WadeeMeenie/lekka  
**APK:** `/home/ubuntu/Downloads/app-release.apk`

> This report separates source-level evidence from real end-to-end evidence. Passing TypeScript and deterministic tests does not establish production readiness.

## Validation matrix

| Test / feature | Result | Evidence | Known issue |
|---|---|---|---|
| TypeScript | PASS | `pnpm check` completed with no diagnostics after hardening changes. | No native-device runtime coverage. |
| Deterministic tests | PASS | 6 active files passed; 17 tests passed; 1 pre-existing auth test skipped. | Does not replace A/B or device testing. |
| Feed cursor pagination | IMPLEMENTED / NOT DEVICE TESTED | Home now uses stable `(created_at,id)` cursors; location-aware RPC migration `202608210003_feed_cursor_pagination.sql`; pure cursor tests pass. | Remote migration application was not independently re-queried after a transient connector timeout, although the retry returned success. |
| Location-aware pagination | IMPLEMENTED / NOT DEVICE TESTED | Database RPC filters by PostGIS radius before returning rows. | Bellville, Stellenbosch, and Johannesburg movement tests were not performed. |
| Public-profile pagination | IMPLEMENTED / NOT DEVICE TESTED | Public profile loads and appends paginated author posts and opens post detail. | No populated multi-page profile was available for manual verification. |
| Media upload recovery | PARTIAL | Photo failures preserve an account-scoped draft with post ID, deterministic storage path, retry attempts, and last error. | Orphan cleanup after a successful upload followed by database association failure is not fully automated. |
| Offline text drafts | SOURCE-VERIFIED / NOT DEVICE TESTED | Draft keys are account-scoped and sync removes only successful entries. | Kill/reopen/network-restore flow was not run on Android. |
| Offline photo drafts | IMPLEMENTED / NOT DEVICE TESTED | Drafts retain local media URI and retry metadata. | Local URI lifetime and platform filesystem behavior require device validation. |
| Reports | IMPLEMENTED / NOT A/B TESTED | Post/profile report actions call server-inserted `reports` rows; self-create policy is present. | Moderation review/admin workflow is not implemented. |
| Blocks | IMPLEMENTED / NOT A/B TESTED | `blocks` table, self-owned RLS policy, client toggle, and profile UI are present. | Cross-account interaction blocking needs adversarial verification across all content paths. |
| Notification events | SOURCE-VERIFIED / NOT A/B TESTED | Follow/comment/reaction triggers and deduplication migration are present; notification execution lockdown migration applied. | No two-user trigger sequence was executed. |
| Unread badge | IMPLEMENTED / NOT DEVICE TESTED | Home badge reads authenticated unread count and formats values above 99 as `99+`. | Realtime badge refresh after another user’s action needs device/session validation. |
| A/B authentication | NOT TESTED | No temporary accounts were supplied or created. | Must be run with two real confirmed Supabase Auth accounts. |
| A/B RLS attack matrix | NOT TESTED | No second authenticated session was available. | Server-side ownership attacks remain an explicit blocker. |
| Storage attack matrix | NOT TESTED | No two-account storage session was available. | Private-media access, update, delete, and replacement attacks remain unverified. |
| Notification read persistence | NOT TESTED | No authenticated device/session sequence was available. | Read state across restart and account switch remains unverified. |
| Multi-device session | NOT AVAILABLE | No second Android device was attached. | Realtime and cross-device persistence remain unverified. |
| Physical Android validation | NOT TESTED | No physical Android device was attached. | Onboarding, guest mode, photo picker, location, offline, and full Social Core flow remain device-unverified. |
| Release APK | PASS for artifact metadata | ZIP integrity passed; `aapt` reported package `com.app.localradarsa`, label `Lekka`, version `1.0.0`; size 37,740,643 bytes. | Installation on a physical device was not tested. |

## Security findings

Application tables use self-owned RLS boundaries in the existing schema, and the new block/report surfaces preserve self ownership. Social notification trigger functions were explicitly locked down after the advisor identified public execution exposure. The remaining advisor findings are the extension-owned `public.spatial_ref_sys` RLS issue, PostGIS installed in `public`, and pre-existing PostGIS/user-creation `SECURITY DEFINER` function exposure. These were not changed in this milestone because they are extension/auth infrastructure decisions rather than Social Core client behavior.

The decisive security gap is evidence, not only code: the required two-account IDOR/RLS attack matrix and private-storage attack matrix are **NOT TESTED**. No service-role credential was used.

## Performance findings

The primary Home feed now requests a bounded page, uses a stable cursor, filters geographically inside the database RPC, and merges pages without duplicates. Public-profile posts are also bounded and cursor-based. The feed still has no measured render-count, payload-size, low-end Android scroll, image-size, or query-count benchmark. Those findings remain **NOT VERIFIED**.

## UX findings

Initial empty fetches retain the existing branded skeleton behavior. Refreshes preserve visible content, and load-more uses a compact activity indicator. Empty states exist for public profiles, saved content, notifications, and comments. Media failures now communicate saved-draft behavior, but retry progress and partial-upload cleanup need additional UI and device validation.

## Device findings

No physical Android device and no second Android device were attached. Consequently, all onboarding, guest mode, authentication, photo-picker, media-upload, location movement, offline kill/reopen, notification persistence, and cross-device observations are **NOT TESTED** rather than claimed as successful.

## Database findings

The source includes migrations for notification deduplication and trigger events, execution lockdown, location-aware cursor pagination, and moderation blocks. The notification and lockdown migrations were applied successfully through the Supabase connector. The feed cursor migration retry returned success after one transient connector timeout. A local generic database execution route was not used for Supabase schema changes because it targeted an incompatible TiDB interface and rejected PostgreSQL syntax.

## Remaining blockers

Production-valid status is blocked by the missing two-account session, missing physical Android device, missing storage attack evidence, missing location movement evidence, and lack of low-end Android performance measurements. Moderation has only the minimum report/block foundation; no admin review queue exists. Media orphan cleanup is partial.

## Next milestone

Run the A/B and physical-device runbook with two confirmed temporary accounts and one Android device. Then add cursor pagination performance telemetry, robust media cleanup/retry UI, and a minimal authenticated moderation review surface.
