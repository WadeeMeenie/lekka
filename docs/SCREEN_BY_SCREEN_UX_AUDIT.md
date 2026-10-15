# Lekka Screen-by-Screen UX, Navigation and Flow Audit

**Audit branch:** `feat/full-screen-ux-audit`  
**Audit baseline:** `main` at the latest successful CI commit before this branch.  
**Purpose:** Review every route and its intended job, inspect navigation entry/exit points, prioritize real UX defects, and make incremental changes that can be verified.  
**Important status rule:** Source inspection is not runtime proof. This document never marks a flow “verified” unless the actual journey has been exercised against the app/backend.

## Research and compatibility decision

Research reviewed 15 October 2026:

- [Expo Router navigation](https://docs.expo.dev/router/basics/navigation/) — route-based navigation and stack behavior.
- [Expo Router introduction](https://docs.expo.dev/router/introduction/) — deep links and typed routes.
- [Ahlan Social Mobile](https://github.com/ahlan-app/ahlan-social-mobile) — an Expo SDK 54, Supabase, Expo Router social-app reference with profiles, follows, comments and messaging.
- [xMind](https://github.com/aashir-athar/xmind-app) — useful feed pagination, optimistic mutation, caching and token-system ideas; its MongoDB/Clerk backend is not compatible with Lekka's Supabase data layer.
- [Clean Expo Posts App](https://github.com/hassaanjamil/rn-expo-posts-app) — useful modular screen/repository separation patterns.
- [React Native compatibility matrix](https://react-native.dev/) — version compatibility must be checked before changing native dependencies.

**Decision:** Keep the existing Expo SDK 54 / React Native 0.81 / Expo Router 6 / TypeScript / NativeWind / Supabase stack. Use open-source apps as behavioral references, not copy-and-paste dependencies. Do not introduce a second component system or replace navigation without a demonstrated need. Keep one design-token source, one data owner per action, and route aliases for legacy links.

## Experience contract

Every screen must have: a clear purpose; a visible primary action; consistent back behavior; real data; loading, empty, error and retry states; accessible labels and touch targets; no duplicate or inert controls; correct permission handling; and an end-to-end test path. A button must not show success before the server confirms the mutation. Form inputs must survive recoverable errors.

## Screen and route inventory

Status labels: **Source reviewed** = inspected in source; **Needs runtime verification** = not proven on a physical device/live backend; **Focused review pending** = the route still needs its own deeper code/flow pass.

| Route / surface | Intended user job and expected flow | Source findings / audit status | Priority |
|---|---|---|---|
| `app/index.tsx` | Choose initial route; resume signed-in session or route to onboarding/auth without loops. | Root gate exists. Verify fresh install, resumed session, expired session and deep-link entry. **Needs runtime verification.** | P0 |
| `app/_layout.tsx` | Mount providers, native stack, safe-area and app-level recovery. | Uses ThemeProvider, SafeAreaProvider, QueryClient and Expo Router. Startup error boundary exposes retry. **Source reviewed.** | P0 |
| `app/(tabs)/_layout.tsx` | Persistent primary navigation with accessible labels. | Five tabs: Home, Radar, Create, Social, Local. Current IA overlaps Radar/Local and hides Inbox/Communities inside Social. **Source reviewed; IA redesign needed.** | P1 |
| `app/(tabs)/index.tsx` | Browse feed, switch feed mode, search/filter, open post/author, react/save/share/report, create. | Rich feed actions, pagination, refresh and draft sync exist. Prior audit found Following is heuristic, not a real follow-graph feed; verify Trending and filter-to-query semantics. **Source reviewed; live journey unverified.** | P0 |
| `app/(tabs)/nearby.tsx` | Discover nearby posts using permission-safe location, radius and filters. | Separate from Local directory while sharing discovery concepts. Verify permission denial, manual area, radius, empty/error and location privacy. **Source reviewed; live RPC unverified.** | P0 |
| `app/(tabs)/local.tsx` | Search local businesses, deals, events, marketplace, jobs and services. | Category-driven directory exists. Competes with Radar for location/discovery mental model. **Source reviewed; category-to-query behavior needs live checks.** | P1 |
| `app/(tabs)/create.tsx` | Publish post, alert, event, business update, deal, listing, job or service. | Category-specific fields, image selection, validation, upload progress and offline draft logic exist. Keep one composer and progressively reveal only relevant fields; verify success navigation, retry and each category's persisted fields. | P0 |
| `app/(tabs)/social.tsx` | Find communities, view followed communities and open messages. | Combines Communities, Following and Messages; message access also appears in header/menu. This hides distinct jobs and duplicates entry points. **Source reviewed; IA redesign needed.** | P1 |
| `app/profile.tsx` | Edit own identity, avatar, bio, interests, area, username and appearance. | Avatar upload and validation exist; settings/theme/account controls are mixed into profile editing. Server username history has a local fallback; verify server remains authoritative. **Source reviewed; needs split and persistence QA.** | P0 |
| `app/public-profile/[id].tsx` | Understand another person, view public posts, follow, buddy, message, report or block. | Actions exist, but initial parallel-load failures are not surfaced as a clear retry state; load-more errors can be swallowed. Profile relationship and visibility rules need multi-account verification. **Source reviewed.** | P0 |
| `app/menu.tsx` | Reach secondary destinations and account actions. | Duplicates communities/radar/notifications access. Profile card previously always showed initials even if a photo existed; this branch now loads the signed avatar URL and displays the real image with initials fallback. | P1 |
| `app/settings.tsx` | One predictable root for account, privacy, appearance, business and support tasks. | Central grouped settings screen exists. Verify every route target, avoid duplicate settings implementations, and ensure each setting actually persists. | P1 |
| `app/account-settings.tsx` | Manage privacy, friends-list visibility and username history. | Server history and privacy mutation paths exist. Verify save failures roll back controls and provide retry; ensure username edit links to the canonical profile editor. | P0 |
| `app/personal-details.tsx` | Manage personal details required by account/profile workflows. | Separate account surface exists. **Focused review pending:** clarify which fields belong here versus Profile and confirm saved values rehydrate. | P1 |
| `app/auth.tsx` | Sign in/up, reset password, continue intended flow. | Error classification, password rules, confirmation/resend and redirects exist. Verify OAuth, deep links, email confirmation, timeout, and `next`/intent redirect paths on Android. | P0 |
| `app/onboarding.tsx` | Guide new users through intent, location and profile setup; resume safely. | Multi-step flow exists. Verify persistence, skip/back semantics, permission denial and restart. | P0 |
| `app/account-intent.tsx` | Choose personal/business intent and continue onboarding. | Route exists. **Focused review pending:** test every choice and its return route. | P1 |
| `app/reset-password.tsx` | Complete a valid password-reset deep link and return to sign-in. | Route exists. Verify malformed/expired links and successful password update on device. | P0 |
| `app/oauth/callback.tsx` | Complete OAuth callback, exchange credentials, and resume the original intended destination. | Root stack registers the callback route. **Focused review pending:** verify state/PKCE, cancellation, error redirects and Android app return. | P0 |
| `app/post/[id].tsx` | Read one post, inspect comments, react/save/share, report or delete own content. | Detail/reaction/comment/save/share/report/delete logic exists. Verify deleted/private posts, owner-only controls, retry behavior and deep links. | P0 |
| `app/edit-post/[id].tsx` | Edit own post and return to the same content context. | Route exists. **Focused review pending:** verify owner authorization, validation, media retention and post-save navigation. | P0 |
| `app/saved.tsx` | Browse saved posts and reopen details. | Route exists. **Focused review pending:** verify unsave behavior, deleted posts and empty/error/retry states. | P1 |
| `app/notifications.tsx` | Read activity and open the correct target. | Read-state UI and post/profile routing exist. Unknown or unsupported target types need a safe fallback; verify failed read updates don't look successful. | P0 |
| `app/messages.tsx` | Inbox, message requests, conversation, send and read messages. | Conversation loading, request acceptance, sending and error states exist. It is not a primary tab; verify message request safety, avatar/identity, ordering, unread state and retry against two accounts. | P0 |
| `app/buddies.tsx` | Manage incoming/outgoing mutual-connection requests and message accepted Buddies. | Accept/decline/remove/message actions exist. Verify state reconciliation and permission errors across two accounts. | P1 |
| `app/community/create.tsx` | Create a community with a clear purpose and rules. | Route exists. **Focused review pending:** verify validation, duplicate submits, creator membership and post-success redirect. | P0 |
| `app/community/[id].tsx` | View community identity/rules/posts/membership and allowed moderation actions. | Community detail and owner cover editing exist. Verify membership state, avatar/cover hydration, permissions, post navigation and empty/error states. | P0 |
| `app/community/post.tsx` | Create a post inside a selected community and return to that community. | Route exists. **Focused review pending:** verify community context survives cancel/success and membership permissions are enforced. | P0 |
| `app/community/settings/[id].tsx` | Manage a community only if the user has appropriate rights. | Route exists. **Focused review pending:** audit each control against server-side permissions and safe back navigation. | P0 |
| `app/business-profiles.tsx` | Choose active posting identity and manage owned business profiles. | Identity switch, edit and verification entry points exist. Verify identity state updates the composer and cannot be spoofed by UI alone. | P0 |
| `app/business-setup.tsx` | Create/edit business identity and public business details. | Route exists. **Focused review pending:** verify required fields, logo upload, ownership, and post-save destination. | P0 |
| `app/business-verification.tsx` | Submit/check verification state with no fake verified status. | Route exists. **Focused review pending:** verify state copy matches server state and cannot be self-awarded. | P1 |
| `app/business-invite.tsx` | Accept an authorized, unexpired business invitation. | Route exists. **Focused review pending:** test valid/expired/reused/wrong-email tokens and post-acceptance redirect. | P0 |
| `app/business-team.tsx` | Invite/manage people and clearly explain role permissions. | Invite generation and email composition exist; staff role copy describes future assigned work. **Do not imply unfinished staff capabilities are live.** Verify role authorization and invitation redemption. | P1 |
| `app/local/[id].tsx` | View a business listing and use only configured contact actions. | Call, website and WhatsApp actions are conditional on data. Verify phone normalization, invalid URLs, no fabricated hours/ratings, and safe empty states. | P1 |
| `app/feedback.tsx` | Submit bug report or feature request with preserved input on failure. | Form and error feedback exist. Verify successful submission and retry on real backend. | P2 |
| `app/admin-yoco.tsx` | Restricted administrative payment setup only for authorized admins. | Admin surface exists. Must never be discoverable or usable by ordinary users; current payment flow remains test-only until live Yoco verification. | P0 |
| `app/dev/theme-lab.tsx` | Internal theme testing only. | Development-only route should not be linked from production UI; confirm build/runtime exposure policy. | P2 |

## Cross-screen issues to fix or prove

1. **Profile identity consistency:** own profile, menu, feed header, public profile, community rows and messages should all use the same actual avatar/display-name data and consistent fallback. This branch fixes the menu profile photo only; other surfaces still require checks.
2. **Navigation hierarchy:** Radar vs Local overlaps; Communities and Inbox are secondary segments; menu repeats primary destinations. Decide and migrate the information architecture before changing tab routes, retaining safe aliases for old deep links.
3. **Profile/settings boundaries:** profile editor, personal details, privacy/username history and appearance are distinct tasks but currently feel fragmented. Define canonical ownership for every field and keep one server-authoritative write path.
4. **Truthful feed modes:** For You, Nearby, Trending and Following must each change the actual query/ranking contract or be removed/renamed until they do.
5. **Loading/error states:** no silent Promise failures, no blank screen after failed requests, and every recoverable error needs a retry action.
6. **Targeted navigation:** post/profile/community/business links must open the exact entity and preserve meaningful back context; notification clicks must handle every target type safely.
7. **Mutation correctness:** likes, saves, follow/buddy, community membership, profile privacy and message requests must update after server confirmation and recover from failure.
8. **Release verification:** CI is necessary but insufficient. Run authenticated multi-account journeys, real-device screenshots, accessibility checks and live Supabase/Yoco tests before calling this launch-ready.

## Acceptance gates before launch

- [ ] Every route above has an owner, clear entry point, expected exit/return destination, and tested loading/empty/error/success state.
- [ ] No dead buttons, fake counters, misleading tabs, unsupported badges or duplicate settings controls.
- [ ] Profile/avatar identity is consistent on own profile, menu, feed, public profile, communities and messages.
- [ ] Following uses the real follow graph; Trending is backed by a defined, tested ranking contract.
- [ ] Auth, onboarding, password recovery and deep-link redirects pass on a physical Android device.
- [ ] Post create/edit/delete, reactions, comments, saves, reporting and privacy pass two-account authorization tests.
- [ ] Local discovery and all category-specific details use live data, privacy-safe location and correct South African currency/date formatting.
- [ ] Community and business actions are tested as owner, member, non-member and unauthorized user.
- [ ] Inbox and notification links land on the correct target and preserve navigation context.
- [ ] TypeScript, lint, unit/integration tests, interaction audit, production-invariant audit, Android builds and live smoke tests pass.
- [ ] Small Android, large Android and web visual/accessibility review is completed.

**Do not mark the overall overhaul complete until the acceptance gates are checked with evidence.**
