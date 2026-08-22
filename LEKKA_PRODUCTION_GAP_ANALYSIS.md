# Lekka Production Gap Analysis

**Audit basis:** current repository HEAD `5b1343772a4ebda41bf38fdcbc5a511fa0753ad1` at the start of this audit, current source files, migrations, tests, and configured Expo/Supabase architecture. This document distinguishes implementation evidence from claims that still require authenticated, multi-user, or physical-device verification.

> **Assessment rule:** A route, helper, migration, mock, or passing TypeScript check is not treated as proof of an end-to-end production feature. Items marked **NOT VERIFIED** require runtime, account, device, or remote-environment evidence.

## Executive summary

Lekka is a substantial Expo SDK 54 mobile codebase with location-first feed and nearby surfaces, authentication, onboarding, social-core routes, business routes, feedback, notifications, saved content, profile routes, Supabase integration, storage architecture, and a native Android internal-test build path. The current application is not yet evidence-supported as a public production launch. The largest remaining risks are incomplete real-world validation, provider configuration, account and storage isolation testing, incomplete routes for messaging/search/blocking/account deletion/data export, and the absence of proof that every migration and policy is applied consistently to the remote Supabase project.

The current Android release identity is preserved as **Lekka**, package **`com.app.localradarsa`**, version **1.0.0**, with configured `arm64-v8a` and `armeabi-v7a` build architectures. The repository contains only an obvious debug keystore under `android/app/debug.keystore`; no release credential is included in source control.

## Current system inventory

| Area | Evidence found | Current classification | Required next evidence or work |
|---|---|---|---|
| Authentication | `app/auth.tsx`, `lib/supabase.ts`, `hooks/use-supabase-auth.ts`, auth-flow tests, email timeout and connection feedback | **PARTIAL** | Validate confirmed-email sign-in, invalid credentials, refresh failure, offline behavior, rate limits, password reset, and session invalidation on a real device/account |
| Google OAuth | Branded Google mark and provider abstraction; provider is flag-gated | **PLACEHOLDER / NOT VERIFIED** | Configure and complete the real OAuth redirect and callback flow before calling it functional |
| Microsoft OAuth | Branded Microsoft mark and provider abstraction; provider is flag-gated | **PLACEHOLDER / NOT VERIFIED** | Configure and complete the real OAuth redirect and callback flow before calling it functional |
| Profiles | `profile.tsx`, `public-profile/[id].tsx`, profile repositories and migrations | **PARTIAL** | Verify profile reads/writes and cross-account visibility with two authenticated accounts |
| Personal onboarding | `onboarding.tsx`, `personal-details.tsx`, account-intent and onboarding tests | **IMPLEMENTED / NOT VERIFIED** | Test first launch, resume, skip/guest behavior, persistence, and authenticated completion on Android |
| Business onboarding | `business-setup.tsx`, `business-invite.tsx`, `business-team.tsx`, `business-profiles.tsx` | **PARTIAL** | Verify ownership, invitation acceptance, team authorization, and error/retry states with controlled accounts |
| Location | `expo-location`, current-location and manual-area paths, nearby and local routes | **PARTIAL** | Test permission denial/revocation, approximate location, movement refresh thresholds, background/foreground transitions, and privacy display on physical Android |
| Home feed | `app/(tabs)/index.tsx`, pagination and loading tests, cached fallback | **PARTIAL** | Validate backend ranking, cursor boundaries, reconnect behavior, and location relevance with real data/accounts |
| Local Radar / Nearby | `app/(tabs)/nearby.tsx`, `app/(tabs)/local.tsx`, PostGIS migration signals and tests | **PARTIAL / NOT VERIFIED** | Verify nearby RPCs, radius bounds, empty/error states, manual override, and privacy-safe returned geometry remotely |
| Posts | create route, post detail route, repositories, media association architecture | **PARTIAL** | Verify authenticated create/update/delete, visibility, media association, duplicate retry, and cross-account authorization |
| Post detail | `app/post/[id].tsx` exists with comments/reactions/saves signals | **PARTIAL** | Exercise pagination, ownership checks, deleted content, deep links, and loading/error recovery |
| Comments | Persistent comments and pagination tests are present | **PARTIAL / NOT VERIFIED** | Run A/B ownership and visibility tests against remote RLS and real sessions |
| Reactions | Like/unlike helpers and notification signals exist | **PARTIAL / NOT VERIFIED** | Verify idempotency, counts, authorization, offline behavior, and notification generation |
| Saves | `saved.tsx`, save repository/action signals | **PARTIAL / NOT VERIFIED** | Verify account isolation, pagination, unsave behavior, and stale/deleted content handling |
| Follows | Public profile and follow/unfollow implementation signals | **PARTIAL / NOT VERIFIED** | Verify reciprocal visibility, duplicate prevention, authorization, and notification behavior |
| Notifications | `notifications.tsx`, notification migration and realtime boundary signals | **PARTIAL / NOT VERIFIED** | Verify delivery, read state, account isolation, realtime reconnect, and permission handling |
| Messaging | No dedicated messaging route was found in the current route inventory | **NOT IMPLEMENTED** | Define and implement only if messaging remains in the approved roadmap; include server authorization and abuse controls |
| Communities | Social entry point and community migration/policy signals exist | **PARTIAL / NOT VERIFIED** | Verify membership, private-community visibility, moderation, invitations, and leave/delete flows |
| Businesses | Business routes, tables, ownership policies, directory signals | **PARTIAL / NOT VERIFIED** | Verify owner/team authorization, public listing visibility, edits, and account separation |
| Events | Directory/event signals and migration tests exist | **PARTIAL / NOT VERIFIED** | Verify creation ownership, discovery radius, RSVP or participation behavior, and moderation |
| Deals | Directory/deal signals exist | **PARTIAL / NOT VERIFIED** | Verify publisher ownership, expiry, visibility, and abuse/report handling |
| Jobs and services | Directory categories are represented in the app inventory | **PARTIAL / NOT VERIFIED** | Verify persistence, search/filter behavior, publisher controls, and reporting |
| Advertising | No complete ad-serving, billing, campaign, or consent system was evidenced | **NOT IMPLEMENTED** | Treat as roadmap work; do not expose advertising claims until policy, billing, measurement, and controls exist |
| Search | No dedicated search route was found in the current route inventory | **NOT IMPLEMENTED** | Define privacy and ranking requirements before implementation |
| Media upload | `expo-image-picker`, Supabase Storage architecture, staged upload state, retry UI, and media tests | **PARTIAL / NOT VERIFIED** | Test permissions, large/corrupt files, interruption, retry after restart, orphan cleanup, and storage isolation on device |
| Offline / outbox | Account-scoped drafts, queued/failed states, retry UI, and tests exist | **PARTIAL / NOT VERIFIED** | Verify app-kill recovery, duplicate prevention, account switching, reconnection, and synchronization against remote data |
| Moderation | Reports, moderation-related migrations/policies, and report signals exist | **PARTIAL / NOT VERIFIED** | Verify report submission, moderator authorization, content lifecycle, and auditability |
| Blocking | No complete blocking route/flow was evidenced in the current inventory | **NOT IMPLEMENTED / NOT VERIFIED** | Define block semantics across feed, profile, comments, communities, and notifications |
| Reporting | Feedback route and report-related backend signals exist | **PARTIAL / NOT VERIFIED** | Verify authenticated ownership, abuse throttling, duplicate reports, and moderator visibility |
| Privacy | Privacy-safe location language and RLS/storage architecture are present | **PARTIAL / NOT VERIFIED** | Perform adversarial A/B tests, inspect logs/caches, and verify no private media or exact location leakage |
| Account deletion | No dedicated account-deletion route was found | **NOT IMPLEMENTED** | Implement a server-authorized deletion workflow with data-retention policy before public launch |
| Data export | No dedicated export route or complete export job was found | **NOT IMPLEMENTED** | Define export format, authorization, expiry, and delivery mechanism |
| Supabase schema | One primary Drizzle SQL migration plus schema/relations files; security tests inspect policy text | **PARTIAL / NOT VERIFIED** | Compare every migration object to the remote project and apply/verify with the proper owner/admin path |
| RLS | Migration security tests assert multiple policies and RLS enablement | **PARTIAL / NOT VERIFIED** | Run authenticated A/B CRUD tests for every exposed table; do not infer remote success from source tests |
| Storage policies | Storage architecture and media policy signals exist | **PARTIAL / NOT VERIFIED** | Verify private bucket access, path ownership, signed URLs, and cross-account denial |
| PostGIS | Migration/test signals include geography, indexes, and nearby functions | **PARTIAL / NOT VERIFIED** | Verify extension functions, spatial indexes, radius limits, and privacy-safe output remotely |
| Rate limiting | No complete application-wide abuse/rate-limit system was evidenced | **NOT VERIFIED** | Add limits for auth, reports, uploads, posts, comments, follows, and RPC parameters |
| Abuse prevention | Moderation/report signals exist, but no complete enforcement evidence | **PARTIAL / NOT VERIFIED** | Add spam controls, account/device heuristics, escalation, and operational review |
| Performance | Cursor pagination, loading states, caching, and build checks exist | **PARTIAL / NOT VERIFIED** | Measure slow-network startup, feed query latency, upload cost, memory, and Android frame performance |
| Accessibility | Accessibility labels, roles, pressed states, and loading states are present in multiple surfaces | **PARTIAL / NOT VERIFIED** | Test TalkBack, font scaling, contrast, focus order, and reduced-motion expectations on Android |
| Tablet/foldable UX | Orientation is portrait; no dedicated adaptive layout evidence | **NOT VERIFIED** | Test Galaxy foldable/tablet classes or explicitly scope support and document limitations |
| Android compatibility | Internal APK built with SDK 54 and arm64/armeabi-v7a libraries | **PARTIAL** | Install and exercise on the Samsung Galaxy S23 FE; test Android permission, back, keyboard, media, and notification behavior |
| Google Play readiness | Internal APK path and app identity are configured; production signing is not configured in source | **NOT READY** | Complete release signing, privacy/data-safety declarations, Play assets, review requirements, and production QA separately from internal testing |
| Observability | Development logs and server instrumentation exist; no complete production dashboard was evidenced | **NOT VERIFIED** | Add privacy-safe crash, auth, upload, API latency, and moderation monitoring with retention rules |
| Backup/recovery | Database migration files and checkpoint history exist | **NOT VERIFIED** | Define remote database backup, restore drills, media recovery, and rollback procedures |

## Release configuration evidence

| Property | Current value |
|---|---|
| App name | `Lekka` |
| Android package | `com.app.localradarsa` |
| Version | `1.0.0` |
| Expo SDK | 54 |
| Android minimum SDK | 24 |
| Configured build ABIs | `armeabi-v7a`, `arm64-v8a` |
| EAS profile | `preview`, internal distribution, APK |
| EAS project ID | Configured in `app.config.ts`; value not repeated here beyond repository evidence |
| Source-controlled signing credentials | None; only `android/app/debug.keystore` was found and is treated as debug material |

## High-priority launch blockers

The current evidence does not support a public launch claim. The most important blockers are: authenticated two-account CRUD and privacy validation; remote schema/RLS/storage verification; physical Android validation; complete media interruption and outbox recovery testing; real OAuth provider configuration if those buttons remain exposed; account deletion and data export; rate limiting and abuse controls; and production signing/Play readiness.

The requested current release change itself is narrower: the timeout connection message and spinner are implemented and tested. A fresh APK should be built only after the current source changes are committed and pushed, and the resulting artifact must be verified independently by manifest, ZIP integrity, ABI, and SHA-256.

## Evidence limitations

No conclusion in this document substitutes for an authenticated multi-user session, a confirmed test inbox, an attached physical Android device, or a remote Supabase administrative verification. Where those prerequisites are unavailable, the classification remains **NOT VERIFIED** or **BLOCKED** rather than **PASS**.
