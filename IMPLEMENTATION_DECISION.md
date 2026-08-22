# Lekka Implementation Decision

**Decision date:** 22 August 2026  
**Input:** `LEKKA_POST_AUDIT_REPORT.md`, `LEKKA_CAPABILITY_MAP.md`, `LEKKA_TEST_GAP_MATRIX.md`, current repository HEAD, and the attached P0/P1 execution brief.

## Decision summary

The highest-value sequence is **validation and reliability before feature expansion**. The first implementation slice will strengthen the existing core rather than add a messaging clone, broad monetization, or unverified UI. Work must preserve RLS, publishable-key-only client configuration, privacy-safe location representation, account-scoped drafts, and explicit provider-configuration messaging.

| Priority | Item | Problem | Why it matters | User impact | Security impact | Business impact | Complexity | Dependencies | Recommended action |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Release/configuration evidence | The audited HEAD has no fresh APK evidence; OAuth providers are not enabled in the current configuration. | Users cannot reliably validate the current product or sign in through advertised providers. | Blocks device testing and causes confusing setup-required flows. | Prevents accidental claims of secure/working auth. | Delays beta learning and retention measurement. | Medium to high | Expo credential configuration, current Supabase variables, build worker capacity. | Produce a fresh APK from exact HEAD; keep unavailable OAuth clearly labelled; never fake provider success. |
| P0 | Two-account authorization validation | Cross-account reads/writes for profiles, posts, relationships, notifications, drafts, media, and communities are not runtime proven. | RLS source evidence is insufficient against IDOR and ownership regressions. | Risk of private data exposure or failed social actions. | Highest-risk open area. | Trust and compliance risk. | Medium | Two confirmed test accounts and safe test data. | Run bounded non-destructive A/B matrix before public beta. |
| P0 | Storage and location privacy validation | Storage isolation and exact-coordinate redaction are not comprehensively runtime proven. | Media and location are sensitive user data. | Users may expose private media or overly precise location. | High privacy risk. | Reputational and regulatory risk. | Medium | Device/session access and safe test objects. | Add automated policy assertions where possible and execute device/API checks with test accounts. |
| P1 | Auth reliability hardening | Email flow has good states, but expiry, recovery, account switching, and installed-build configuration need proof. | Authentication is the entry point for every protected feature. | Reduced lockouts, stuck states, and confusing recovery. | Better session/account boundaries. | Improves activation and retention. | Medium | Fresh configured build and test inboxes. | Validate existing flow first; add only confirmed fixes. |
| P1 | Media reliability hardening | Picker, validation, compression, EXIF, cancellation, interruption, and orphan cleanup are not fully evidenced. | Media is a core social contribution path. | Less upload loss and clearer recovery. | Reduces accidental metadata and cross-account media risk. | Increases posting success and content density. | High | Device media tests and storage policy evidence. | Complete a single-photo reliable path before multiple media. |
| P1 | Offline/outbox lifecycle hardening | Account-scoped drafts exist, but kill/restart, expired auth, reconnect, and duplicate behavior are not device proven. | Users must not lose posts when connectivity changes. | Protects work and reduces duplicate posts. | Prevents cross-account draft leakage. | Improves trust in local utility. | Medium | Device and network test harness. | Add lifecycle tests and deterministic conflict rules before expanding offline scope. |
| P1 | Consistent error-state contract | Async operations do not all demonstrably expose the same loading/empty/offline/timeout/auth/validation/server/unknown/retry states. | Inconsistent failures create dead ends and support burden. | Users know what happened and what to do next. | Avoids raw backend details and unsafe retries. | Improves conversion and retention. | Medium | Inventory of async operations and reusable helpers. | Standardize the highest-traffic auth, feed, radar, post, media, and notification paths. |
| P1 | Local Radar correctness | Location permission, movement, GPS failure, approximate location, and query-plan behavior remain unverified. | Local Radar is Lekka’s core differentiator. | Nearby results must be relevant and privacy-safe. | Limits exact-location exposure. | Defines the moat and repeat usage. | High | Physical Android testing and representative backend data. | Validate before adding more radar categories or map polish. |
| P2 | Notification depth | In-app and push recipient, duplicate, deep-link, and unread behavior are not fully proven. | Notifications drive re-engagement but can expose activity. | Accurate, non-spammy alerts. | Protects recipient/actor privacy. | Supports retention. | Medium | Device push setup and two accounts. | Validate in-app first, then push. |
| P2 | Business monetization | Business setup exists, but verification, analytics, lead attribution, and revenue loops are incomplete. | Monetization without trust and density is premature. | Avoids spammy or low-value promotion. | Requires moderation and ownership controls. | Potential future revenue. | High | Business supply, moderation, analytics. | Build only after local density and business utility are validated. |
| P2 | Communities and messaging | Communities are incomplete and messaging is missing as a full product. | Large surfaces add abuse and authorization complexity. | Avoids unfinished experiences. | Reduces privacy/moderation risk. | Prevents expensive distraction. | High | Product scope, abuse model, notifications, moderation. | Do not build yet; define only after core loop evidence. |

## Selected implementation sequence

1. Confirm current source and audit artifacts, then preserve the decision document.
2. Add or strengthen only deterministic reliability/security checks that are possible without a physical device or second account.
3. Complete the configured fresh-build attempt from the exact GitHub HEAD and record the actual artifact or blocker.
4. Require controlled two-account and device validation as the next gate rather than claiming production readiness.

## Explicit non-goals

This milestone will not add fake Google/Microsoft authentication, a messaging clone, broad monetization, national expansion, unverified AI ranking, or UI for backend capabilities that cannot be validated. No service-role keys, database passwords, OAuth secrets, keystores, or APK binaries will be committed.

## Success criteria

The implementation decision is successful when each approved code change has TypeScript coverage, deterministic tests, lint, security reasoning, loading/error behavior, and a documented validation boundary. Release success additionally requires a fresh APK from the exact pushed commit; if the build fails, the report must state `APK: NOT GENERATED` and include the real blocker.
