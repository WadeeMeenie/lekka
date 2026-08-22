# Lekka Post-Audit Executive Report

**Audit date:** 22 August 2026  
**Audit basis:** Current repository at GitHub HEAD `8cca199691e79b801c0cc770de37b234a3ba4dfb`, source and migration inspection, deterministic tests, TypeScript validation, lint, live Supabase schema inspection already recorded in the repository, and the available APK evidence. No physical Android device, controlled two-account session, production traffic, or destructive security test was available for this audit.

> **Evidence rule:** Source presence, database presence, unit-test success, and APK generation are not equivalent to verified end-to-end product behavior.

## Executive conclusion

Lekka has a credible hyperlocal social-network foundation rather than a production-complete platform. The strongest current assets are the location-first product direction, Supabase-backed social and profile foundations, username safety work, account-scoped offline drafts, explicit loading/error states, and a coherent South African local-discovery opportunity. The principal risks are not cosmetic: many critical paths remain unverified on a real device and across accounts; Google and Microsoft authentication still depend on external provider configuration; media privacy and interruption recovery are not physically tested; community and messaging experiences are incomplete; and the latest fresh APK attempt was blocked before artifact generation.

**Release classification:** Suitable for controlled internal testing only. **Not evidence-supported for public beta or production.**

## What actually works or is strongly evidenced

The source contains authenticated email flows, session persistence architecture, password reset paths, onboarding, profile editing, avatar selection and Storage integration, username normalization and availability checks, server-backed username history, cooldown logic, account settings, feed and nearby repositories, social repositories, feedback submission, offline draft/outbox logic, location helpers, business-profile and invitation flows, and multiple deterministic test suites. The Supabase client architecture uses publishable client credentials rather than a service-role key in the mobile bundle. The live schema audit recorded a unique username constraint and RLS policies for the newer username tables.

These claims describe **implemented source behavior or static evidence**. They do not certify that every path works on a Samsung device, under network interruption, with expired sessions, or across two accounts.

## What only looks implemented or remains partial

Several capabilities have a UI or repository surface without sufficient end-to-end evidence: social authorization across accounts, push notifications, precise location and movement behavior, media interruption and orphan cleanup, community membership, business verification and analytics, and production-grade moderation workflows. The UI can suggest breadth beyond the currently verified user experience. Messaging is not a complete product surface and should remain explicitly out of scope until a real conversation model, authorization model, abuse controls, and notification behavior are designed.

## What is broken or blocked

Email authentication in a previously installed build displayed a backend-not-configured state when Supabase build variables were absent. The project configuration has since been prepared for those variables, but a fresh device build is required to prove the installed binary contains them. Google and Microsoft buttons accurately report that provider setup is required; they are not usable until the corresponding Supabase providers and redirect URLs are configured. The latest managed APK attempt failed during `Resolve build configuration` with `Google Service Account Keys cannot be set up in --non-interactive mode`. The local Gradle fallback failed when its daemon disappeared under sandbox memory pressure. Therefore **APK for the audited commit: NOT GENERATED**.

## Security findings

Static migration evidence shows RLS, owner checks, authenticated policies, private media-bucket policies, business role checks, moderation tables, and account-scoped local outbox keys. The username column has a database uniqueness constraint and the username history/event tables have authenticated policies. However, the most important account-isolation assertions remain **UNVERIFIED** because no controlled two-account runtime session was available. Storage isolation, notification recipient isolation, private community access, blocked-user behavior, and concurrent write races need bounded non-destructive tests. The `spatial_ref_sys` restriction attempt remains extension-owned and unresolved; this is a known database-administration limitation rather than a reason to weaken application RLS.

## Location and privacy findings

The product has a location-first engine, radius filtering, manual-area fallback, privacy-safe area presentation, PostGIS/RPC migration support, and movement/location helpers. Exact-coordinate exposure in every API response, log, notification, and edge case is not fully runtime-verified. GPS denial, approximate-location behavior, movement thresholds, stale location, spoofing, and background/foreground transitions require physical-device validation. Scaling is plausible with PostGIS indexes and bounded radius queries, but query plans and production cardinality have not been measured.

## Media findings

The device-to-Storage path is present: picker, client-side state, upload, database association, signed display, and retryable draft handling. The audit does not establish complete MIME/extension enforcement, image compression, EXIF stripping, cancellation semantics, large-image behavior, multi-image support, or orphan cleanup under all paths. A user-facing upload state model is a strength, but a physical interruption and account-isolation test is still required.

## UX and accessibility findings

The product includes branded loading states, error states, retry affordances, field-level validation, character counters, accessible username status announcements, and explicit authentication gates. Highest-value UX risks are configuration-dependent provider buttons that look available but cannot work, long onboarding and account-intent paths that need device testing, and the lack of a reliable fresh APK for validating the current experience. Accessibility still needs screen-reader traversal, font-scaling, keyboard, reduced-motion, touch-target, contrast, and landscape checks on representative devices.

## Product and competitive position

**Current moat:** Hyperlocal context combining nearby activity, local businesses, alerts, events, services, and social interactions rather than a generic global feed.

**Potential moat:** A trusted, privacy-safe local operating layer for South African suburbs, townships, towns, and rural communities, with useful local commerce and community alerts that are more actionable than broad social feeds.

**Biggest weakness:** The product currently has more architectural breadth than verified daily-use depth; the core loop of discover nearby value, act, return, and trust the result is not yet proven at scale or on-device.

**Biggest opportunity:** Make Local Radar materially better than a generic feed through relevance, freshness, safety, local business utility, and low-friction contributions.

**Biggest security risk:** Unverified multi-account and Storage isolation, especially around private media, notifications, drafts, profile mutation, and location-derived data.

**Biggest retention risk:** Sparse or low-quality local content, unclear value before onboarding is complete, and incomplete provider/authentication setup causing early abandonment.

Compared with Facebook, Instagram, TikTok, Reddit, X, Threads, Nextdoor, Google Maps, and WhatsApp Communities, Lekka should not compete on global content volume, creator tooling, or messaging breadth. It should compete on **local relevance, actionability, privacy-safe proximity, and local-business/community utility**.

## South African strategy and business model

The highest-value near-term segments are local discovery and trusted utility: neighbourhood alerts, businesses and deals, events, services, jobs, and recommendations. Prioritize features that create repeated local value and can support business revenue without making the consumer experience pay-to-use.

| Category | Recommendation | Rationale |
|---|---|---|
| Consumer feed, radar, basic posting, safety reporting | Free | Builds local density and trust. |
| Verified business profiles and contact tools | Free foundation, paid upgrades later | Establishes supply-side value before monetization. |
| Featured local placement and promoted deals | Paid after relevance and moderation work | Most direct revenue path, but requires anti-spam controls. |
| Business analytics and lead reporting | Paid | Clear business ROI once event instrumentation is trustworthy. |
| Verification | Carefully scoped paid or partner-assisted | Valuable only if verification criteria are credible. |
| Payments, complex ad exchange, creator subscriptions | Future | Avoid premature financial and platform complexity. |
| Full messaging clone | Do not build yet | High abuse, privacy, moderation, and notification cost without a proven need. |

## Scalability assessment

At **1,000 users**, the current architecture is suitable for controlled testing if database policies and indexes are validated. At **10,000 users**, feed pagination, Storage bandwidth, notification fan-out, and realtime subscription scope need measurement. At **100,000 users**, server-side ranking, notification queues, image transformation/CDN strategy, and background job boundaries become material. At **1 million users**, the current client/repository foundation is not sufficient evidence of readiness; partitioning, event-driven fan-out, regional delivery, abuse prevention, observability, and query-plan governance would be required.

The largest likely cost centers are image delivery, notification fan-out, realtime subscriptions, expensive nearby queries without measured plans, and unbounded analytics/event growth. Cursor pagination and PostGIS indexes are positive foundations, not proof of scale.

## Product scorecard

| Area | Score | Evidence-qualified interpretation |
|---|---:|---|
| UX | 66 | Thoughtful states and flows, but device validation and configuration friction remain. |
| UI | 72 | Coherent branded mobile foundation; breadth and responsive behavior need device review. |
| Authentication | 58 | Email architecture is substantial; OAuth providers are not configured and device proof is incomplete. |
| Security | 61 | Good static RLS direction; two-account and Storage adversarial tests are missing. |
| Privacy | 67 | Privacy-safe location concepts exist; complete response/log/device verification is incomplete. |
| Social | 60 | Core repository/UI coverage exists; end-to-end authorization and depth are unverified. |
| Local Radar | 70 | Strongest differentiating foundation; movement, GPS, and scale remain unverified. |
| Feed | 63 | Pagination and cache concepts exist; ranking and reconnect behavior need runtime proof. |
| Media | 57 | Upload states and retries are good; privacy and interruption hardening are incomplete. |
| Offline | 62 | Account-scoped drafts and retry paths exist; lifecycle tests are missing. |
| Notifications | 45 | Architecture exists, but push, recipient correctness, duplicates, and deep links are unverified. |
| Business | 52 | Setup and invitations exist; verification, discovery, analytics, and monetization are partial. |
| Communities | 30 | Database vocabulary exists, but a complete user-facing product is not evidenced. |
| Moderation | 45 | Reporting/blocking surfaces exist; operational and cross-account testing is incomplete. |
| Performance | 55 | Bounded pagination and indexes help; no representative device or load measurements. |
| Scalability | 48 | Plausible foundation, insufficient production evidence. |
| Accessibility | 58 | Several intentional affordances exist; device and assistive-technology audit is pending. |
| Monetization | 35 | Clear future paths, but no validated revenue loop. |

**Overall product score:** 56/100  
**Private beta score:** 64/100  
**Public beta score:** 43/100  
**Production score:** 29/100

## Top-tier roadmap

### Top 10 things to fix

1. Produce a fresh APK from the audited commit and verify package, version, ABI, hash, and install.
2. Complete two-account authorization and account-isolation testing.
3. Configure and device-test email authentication, OAuth providers, expiry, and recovery.
4. Validate Storage privacy, overwrite/delete boundaries, and signed URL behavior.
5. Test Local Radar permission denial, approximate location, movement, and stale data.
6. Verify notification recipient, unread, deep-link, duplicate, and push behavior.
7. Harden media limits, compression, EXIF handling, cancellation, and orphan cleanup.
8. Measure nearby/feed query plans and notification/realtime cost under representative load.
9. Make configuration-dependent buttons visibly actionable or hide them until configured.
10. Establish crash/error observability and a release regression checklist.

### Top 10 things to build

1. Verified Local Radar relevance and freshness loop.
2. Strong local-business profiles, contact, deals, and event utility.
3. Safety/alert trust, moderation queue, and escalation workflows.
4. Server-enforced offline sync conflict and deduplication rules.
5. Image transformation and CDN pipeline.
6. Notification preferences and reliable deep links.
7. Community membership and privacy flows only after product scope is defined.
8. Business analytics and lead attribution.
9. Search across local people, places, events, and posts.
10. Accessibility and low-bandwidth optimization as first-class release requirements.

### Top 10 things not to build yet

1. A full WhatsApp-style messaging clone.
2. Livestreaming.
3. Complex creator monetization.
4. An ad exchange.
5. In-app payments before a clear transaction need exists.
6. Large-scale AI recommendations before data quality is reliable.
7. Gamification and badges without a retention hypothesis.
8. Broad national expansion before one-city density works.
9. More UI shells for backend capabilities that are not verified.
10. Feature work that bypasses two-account, device, privacy, and release validation.

## Recommended next milestone

**Internal validation release, not feature expansion.** Configure the preview environment and OAuth providers, produce a fresh APK from the exact GitHub HEAD, run a controlled two-account and Samsung Android test plan, validate Storage/location/notification boundaries, and record evidence. Only after that should the team choose one P0/P1 product improvement based on observed user friction.

## GitHub and APK status

| Item | Status |
|---|---|
| Audited GitHub HEAD | `8cca199691e79b801c0cc770de37b234a3ba4dfb` |
| Source changes in this audit | None; audit documents only |
| Fresh managed APK for audited HEAD | **NOT GENERATED** |
| Managed build blocker | Google Service Account Keys could not be set up in non-interactive mode |
| Local build fallback | Gradle daemon disappeared under sandbox memory pressure |
| Physical device | **NOT TESTED** |
| Previous APK | Exists, but is not valid evidence for this audited HEAD |

## References

[1]: https://github.com/WadeeMeenie/lekka "Lekka GitHub repository"
[2]: https://docs.expo.dev/build-reference/app-versions/ "Expo app version configuration"
[3]: https://supabase.com/docs/guides/auth "Supabase Auth documentation"
[4]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security documentation"
[5]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control documentation"
[6]: https://postgis.net/docs/ "PostGIS documentation"

> References [2]–[6] provide general platform context only. Product-status claims above are based on the repository and test evidence described at the start of this report.
