# Lekka UX/UI Route Audit

**Updated:** 15 October 2026  
**Implementation branch:** `feat/full-screen-ux-audit`  
**Status:** Source-level route audit and first UX corrections are in progress. This document is not a claim that all live flows or devices have passed QA.

## Research and stack compatibility

Reviewed:
- [Expo navigation guidance](https://docs.expo.dev/develop/app-navigation/)
- [Expo Router common navigation patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/)
- [Ahlan Social Mobile](https://github.com/ahlan-app/ahlan-social-mobile) — React Native/Expo/Supabase social-app reference
- [xMind](https://github.com/aashir-athar/xmind-app) — Expo Router, feed, profile, and navigation patterns
- [Lekka Product Quality Blueprint](./PRODUCT_QUALITY_BLUEPRINT.md)
- [Category-Specific UX/UI Specification](./CATEGORY_SPECIFIC_UX_UI_SPEC.md)

**Compatibility rule:** retain Expo SDK 54, React Native 0.81, Expo Router 6, TypeScript, Supabase, and the existing repositories/hooks/theme context. Do not copy web-only React systems such as StyleX/Astryx into the native app. Adopt the transferable principles—semantic tokens, explicit navigation, accessible controls, shared loading/error states, category-specific detail pages, and measurable journeys—inside the current stack.

## Primary navigation contract

The target five destinations are **Home, Explore, Create, Communities, Inbox**. The local directory remains reachable from Explore and the account menu, but does not occupy a duplicate bottom-tab destination. Communities owns groups and membership; Inbox owns direct messaging. The Home avatar should open the user's own profile, with the global menu as a separate action. Existing deep links should continue to resolve while duplicate entry points are migrated.

## Route-by-route assessment

“Implemented” means source paths exist; it does not imply live Supabase, multi-account, or physical-device verification.

| Route | Expected job | Current source assessment / next acceptance |
|---|---|---|
| `/` | Entry and route decision | Initial route gate exists. Verify fresh install, returning session, storage failure, and incomplete onboarding after restart. |
| `/onboarding` | Explain value, location and preferences; continue as guest or account | Multi-step flow exists. Verify location grant/deny/manual area, persistence, back behavior, and handoff into Explore/Home settings. |
| `/auth` | Sign up, sign in and account recovery entry | Supabase auth screen exists. Verify invalid/duplicate credentials, email confirmation, rate limits, network errors and success redirects. |
| `/oauth/callback`, `/reset-password` | Complete OAuth and password reset | Routes exist. Provider configuration, expired links and installed-app deep links remain live verification gates. |
| `/(tabs)/index` | Local feed, search, post actions, notifications and profile access | Feed pagination, refresh, feedback, reaction/save/share/report and honest feed error states exist. Home avatar now has a dedicated profile destination; verify menu remains reachable and profile photo fallback works. |
| `/(tabs)/nearby` (Explore) | Discover nearby posts, alerts, businesses, events and deals | Radius, location, content-type filters and explicit result destinations exist. Verify each filter changes server results, and post/business/event/deal links open the correct detail. |
| `/(tabs)/create` | Publish general posts, alerts and category-backed content | Shared composer and media pipeline exist. Verify required fields per category, inline validation, upload cancellation/retry, duplicate prevention, draft recovery and server persistence. |
| `/(tabs)/social` (Communities) | Discover public groups and manage joined groups | Messaging has been removed from this screen; segments are Communities/My communities. Verify join/leave/request state, community details, owner/moderator permissions and error recovery. |
| `/(tabs)/messages` (Inbox) | Conversations, requests and direct messages | Dedicated tab reuses the actual messaging flow. Verify conversation deep links, message request accept/reject, read state, signed avatars, realtime reconnect and two-account send/receive. |
| `/(tabs)/local` | Local directory | Retained as a secondary route, not a primary tab. Reach it from Explore and the menu. Verify category selection, search, detail-sheet actions, manual-area persistence and business detail navigation. |
| `/post/[id]` | Read a post and manage comments/reactions/saves/shares/reports | Detail interaction paths exist. Verify deleted/private content, comment pagination, unauthorized actions, retry, and state reconciliation after server errors. |
| `/edit-post/[id]` | Edit owned content | Route exists. Verify ownership, field validation, retained media, failed save and return destination. |
| `/public-profile/[id]` | View a user; follow, message, Buddy, block/report | Relationship actions and post pagination exist with recovery work. Verify self/other/private/blocked profiles, counts, load failures, and message destination. |
| `/profile` | Edit own identity, avatar, bio, interests and appearance | Self-profile editor exists with server-backed profile paths and load-recovery safeguards. Verify avatar upload/signed URL, username availability/cooldown, save after load failure, restart persistence and logout. |
| `/account-settings` | Account security, username history and privacy | Route exists. Verify server-backed username history/cooldown and consistency with profile editing. |
| `/personal-details` | Manage personal identity details | Route exists. Verify field validation, consent/privacy expectations, RPC persistence, and revisit/restart state. |
| `/settings` | One entry point for account, privacy, appearance, discovery and help | Settings hub exists. Verify every row points to a real screen; do not show fake switches or duplicated controls. Consolidate duplicate settings ownership in later slices. |
| `/saved` | Revisit saved posts | Screen and repository paths exist. Verify account isolation, unsave consistency, deleted/private targets, pagination and empty/error states. |
| `/notifications` | Review activity and open the referenced object | Recovery/read-state work exists. Verify unread counts, persisted read state and stale/deleted target destinations. |
| `/buddies` | Manage connection requests | Dedicated screen exists. Verify incoming/outgoing/accepted/declined states, duplicate requests, block behavior and message routing into the selected conversation. |
| `/community/create` | Create a group | Atomic create path exists. Verify validation, owner membership, duplicate names, permission failures and post-create redirect. |
| `/community/[id]` | Community overview, membership and posts | Screen exists. Verify public/private membership, cover/avatar rendering, owner controls, member posting and safe back behavior. |
| `/community/post` | Publish to a community | Route exists. Verify membership/role checks, input/media validation and return to the correct community. |
| `/community/settings/[id]` | Manage community settings | Route exists. Verify owner/moderator authorization, persistence and unauthorized negative cases. |
| `/local/[id]` | View a business profile | Business detail exists. Verify configured contact actions, area/address privacy, signed media and unavailable-business recovery. |
| `/discovery/[type]/[id]` | View event/deal details | Dedicated event/deal detail route exists. Verify direct reads under RLS, invalid/deleted IDs, dates in South African locale, retry and conditional business link. |
| `/menu` | Secondary navigation and sign out | Menu now resolves the real signed profile photo with initials fallback. Verify all destinations, admin-only row visibility and sign-out confirmation. |
| `/business-profiles`, `/business-setup` | Create/select/manage business profiles | Routes exist. Verify owner-scoped reads/writes, required fields, safe public area and business identity switching. |
| `/business-team`, `/business-invite` | Manage business team invitations | Routes exist. Verify invitation creation, token expiry, exact-email acceptance, role enforcement and failure messaging. |
| `/business-verification` | Submit/view business verification | Route exists. Never imply verified status without persisted evidence; verify status transitions and permission boundaries. |
| `/feedback` | Submit product feedback | Route exists. Verify validation, submission state, retry and privacy-safe payloads. |
| `/account-intent` | Choose personal/business use | Route exists. Verify persisted choice and correct onward onboarding. |
| `/admin-yoco` | Restricted payment administration | Route exists. Must be blocked by server-side admin authorization for non-admins; UI visibility alone is not security. |
| `/dev/theme-lab` | Developer-only theme testing | Development utility exists. Verify it is not linked or exposed as a production user destination. |

## Confirmed corrections in the current overhaul

- Main tabs now distinguish Home, Explore, Create, Communities and Inbox; the Local directory remains a secondary destination.
- Messaging no longer sits inside Communities.
- The community-membership segment is labelled “My communities,” not “Following.”
- Explore result cards use a canonical destination helper for post/alert, business, event and deal items.
- Event/deal details load persisted rows and have loading, retry and unavailable states.
- The Home feed no longer presents unsupported Trending/Following modes or fabricated ranking; it distinguishes live errors from empty content and uses the saved area when device location is unavailable.
- Profile editing has load-recovery safeguards so failed reads do not silently overwrite saved data.
- Notifications and public profiles have explicit recovery paths.
- Home avatar now opens the user's own profile; menu remains a separate action.
- Feed cards no longer wrap every action in one parent pressable: post content opens details, the author avatar opens the author/business profile, and reaction/save/share/menu actions remain independent.

## Release blockers / evidence still required

1. Finish TypeScript, interaction audit, architecture audit, tests, lint, Expo compatibility/doctor and Android builds on the final PR head.
2. The discovery-category migration has been applied to local-radar-sa and the function definition/execute grants were verified. Runtime query calls succeeded, but live data is too sparse to validate real result navigation: the project currently has 2 posts and zero location-tagged posts, businesses, events or deals.
3. Run authenticated two-account tests for profile saves, avatar storage, follows/blocks/reports, comments/reactions/saves, community membership/moderation, message requests and send/receive.
4. Use a staging environment or approved real test accounts with location-tagged content for discovery journeys; do not seed fake data into production. Run physical Android smoke tests for fresh install, login, Explore detail navigation, create post/photo, profile save/restart, inbox, notifications, back stack and offline/error recovery.
5. Review screenshots at small Android sizes, large text, light/dark themes and responsive web; test touch targets and screen-reader labels.
6. Do not call the app launch-ready until these gates have evidence. CI success alone does not prove live backend or device correctness.
