# Lekka Internal Beta Validation Record

**Release:** Lekka 1.0.0  
**Package:** `com.app.localradarsa`  
**Scope:** Internal beta validation only. No unrelated features, advertising, AI, payments, advanced business tools, seed data, or database changes were added.

> **Status: INTERNAL TESTING.** The current environment has no attached Android device and no confirmed two-account test session, so all device- and multi-account-dependent checks are explicitly marked **BLOCKED / NOT TESTED**.

## Validation matrix

| Area | Status | Evidence / limitation |
|---|---|---|
| Physical Android device | **BLOCKED** | `adb devices` returned no attached device. APK installation and launch were not tested on hardware. |
| Fresh install | **BLOCKED** | Requires a physical Android device. |
| Current location | **BLOCKED** | Foreground location architecture is present, but permission, area display, Home/Radar changes, distance, and exact-coordinate presentation were not device-tested. |
| Movement | **BLOCKED** | Bellville/Stellenbosch or equivalent movement test was not possible. |
| Manual exploration | **BLOCKED** | Device interaction was unavailable; architecture was inspected only. |
| Guest mode | **NOT DEVICE TESTED** | Source and web preview were inspected; protected actions use the Join Lekka gate. Native guest flow was not executed on hardware. |
| Account A | **BLOCKED** | No confirmed test account/session was available. |
| Account B | **BLOCKED** | No confirmed second test account/session was available. |
| RLS attacks | **BLOCKED** | No A/B authenticated session for actual Supabase responses. Static policies and deterministic security tests were reviewed. |
| Storage isolation | **BLOCKED** | No two-account/device session to test anonymous access, cross-account read, update, or delete. Static private-bucket policies were reviewed. |
| Offline | **BLOCKED** | Account-scoped outbox is statically partitioned by owner ID; kill/reopen, reconnect, and A→B isolation were not device-tested. |
| Photo recovery | **BLOCKED** | Media retry/draft logic is present; interruption, retry, duplicate prevention, and restart persistence were not physically tested. |
| Notifications | **BLOCKED** | Trigger/dedupe/read/badge/navigation code exists; actor, recipient, target, restart persistence, and unread behavior were not tested with two users. |
| Private community | **BLOCKED** | No authenticated member/non-member session. Policy review identified a release-review concern: public membership reads are defined for `community_members`. No database change was made. |
| Media metadata | **PARTIAL / STATIC ONLY** | Bucket is private and signed URLs are used, but `post_media` association rows have a public-read policy in the core migration. Cross-account exposure was not tested. |
| UX | **NOT DEVICE TESTED** | Web/mobile-sized preview verification and source review found no new blocking defect. Real-user native feedback remains unavailable. |
| Performance | **NOT DEVICE TESTED** | No FPS, memory, thermal, battery, startup, scroll, or low-end Android measurements were claimed. |
| Automated checks | **PASS** | `pnpm check` passed; `pnpm test` passed: 6 files, 17 tests, 1 pre-existing skipped auth test. `pnpm lint` passed with 0 errors and 16 existing warnings. |

## Confirmed defect fixed

The available lint run found one real static defect in `app/onboarding.tsx`: an event handler named `useLocation` was classified by the React Hooks rule as a hook call inside a callback. It was renamed to `requestLocation`, with no behavior change. The follow-up TypeScript, lint, and test runs passed. The remaining lint output contains 16 non-blocking warnings, including unused imports, import ordering, array-type style, and existing effect-dependency warnings.

## APK delivery

A new release APK was built after the fix using the constrained arm64 Gradle pipeline. The artifact is preserved at `/home/ubuntu/Downloads/app-release.apk` and is attached to the final delivery message.

| Property | Verified value |
|---|---|
| File | `app-release.apk` |
| Size | 37,740,639 bytes |
| SHA-256 | `a9e686050694fb2780cdc53cbf29c415fc239471451d1105c5db58b8acd41d73` |
| ZIP integrity | PASS |
| Package | `com.app.localradarsa` |
| App name | `Lekka` |
| Version | `1.0.0` |
| ABI | `arm64-v8a` only; 22 native libraries |
| Installation | NOT TESTED — no device attached |

The hash differs from the previously recorded release because this is a newly built artifact after the onboarding lint fix. The APK metadata remains identical. No byte-for-byte reproducibility claim is made across different source/build states.

## Bugs and remaining blockers

**Bugs found:** one onboarding lint defect; it was fixed. The lint run still reports 16 non-blocking warnings. Static policy review retains two security-review questions: private-community membership visibility and public-read `post_media` association metadata. These were not changed because the milestone prohibits speculative database edits.

**Bugs fixed:** the onboarding event-handler lint defect was corrected and regression checks passed.

**Bugs remaining:** physical-device behavior, two-account authorization, storage isolation, real notifications, private-community access, offline kill/reopen/session switching, location movement, media interruption recovery, and low-end performance remain unverified rather than declared failed.

## Release assessment

**INTERNAL BETA STATUS: INTERNAL TESTING.** The APK is built and structurally verified, but this milestone cannot honestly promote Lekka to private beta, public beta, or production until the blocked device and multi-account matrix is executed.

## Required next actions

1. Install the attached APK on a physical Android device and run the fresh-install, location, movement, manual-exploration, guest, photo, offline, and performance flows.
2. Create two temporary confirmed Supabase Auth accounts and execute the A/B RLS, storage, notification, follow, comment, reaction, save, block, report, and private-community matrix.
3. Resolve the `community_members` public-read and `post_media` association-read policy questions based on observed product requirements before broader beta distribution.
