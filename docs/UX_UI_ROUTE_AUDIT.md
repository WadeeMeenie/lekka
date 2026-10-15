# Lekka UX/UI Route Audit — 15 October 2026

**Branch:** `feat/full-ux-overhaul`  
**Purpose:** Track the actual screen/route contracts, known UX failures, implementation status, and release evidence.  
**Rule:** Source inspection and green CI are not equivalent to successful live-backend or physical-device journeys.

## Research and compatibility decision

Research references:
- Expo Router navigation and protected-route guidance: https://docs.expo.dev/develop/app-navigation/ and https://docs.expo.dev/router/basics/common-navigation-patterns/
- Open-source Expo/Supabase social-app reference: https://github.com/ahlan-app/ahlan-social-mobile
- Open-source social feed/profile/navigation reference: https://github.com/aashir-athar/xmind-app
- Existing research: [UX/UI Research and Overhaul](./UX_UI_RESEARCH_AND_OVERHAUL.md), [Product Quality Blueprint](./PRODUCT_QUALITY_BLUEPRINT.md), and [Category-Specific UX/UI Specification](./CATEGORY_SPECIFIC_UX_UI_SPEC.md).

**Compatibility decision:** keep Expo SDK 54, Expo Router 6, React Native 0.81, TypeScript, Supabase, existing theme context, and current repository/data-access layer. Do not transplant web-only React design systems or add a second navigation/state/data stack. Reuse patterns—semantic design tokens, accessible controls, explicit route hierarchy, honest loading/error/empty states, and shared data actions—inside the current stack.

## Route-by-route inventory

Statuses describe source inspection, not a claim of device verification.

| Route / screen | Expected user job | Current assessment | Required acceptance |
|---|---|---|---|
| `/` | Decide whether to continue onboarding or enter the app | Entry gate exists; persistence and auth interactions need fresh-install/returning-user verification | Fresh install, app restart mid-onboarding, completed guest, authenticated return |
| `/onboarding` | Understand value, choose location/preferences, continue as guest or account | Multi-step flow exists; location/settings handoff needs end-to-end verification | Permission grant/deny/manual area, back/restart, account choice |
| `/auth` | Sign up, sign in, recover account | Supabase auth UI exists; user-facing error specificity and email-confirmation state need review | Valid/invalid credentials, duplicate account, confirmation, network failure, password reset |
| `/oauth/callback`, `/reset-password` | Complete provider auth / reset credentials | Route files/configuration exist; live provider redirects and deep links remain unverified | Valid/expired/malformed callback and reset links on installed app |
| `/(tabs)/index` | Browse feed, search, open posts/profiles/notifications, react/save/share | Feed, pagination and social actions exist; own-avatar destination was menu rather than profile (fixed on this branch). Search only filters loaded feed content, not global content | Feed query, pagination, refresh, empty/error/offline, profile/avatar, post detail, all mutations |
| `/(tabs)/nearby` (Explore) | Discover nearby posts, alerts, businesses and local categories | Location/radius/type filters exist. **Result cards currently render as non-pressable views**, so they do not open detail screens; category detail coverage is incomplete | Every result has an appropriate working detail destination; filters change server results; area/radius persist |
| `/(tabs)/create` | Create a post, alert, event or listing | Shared composer and category fields exist; verify each category's required fields against persisted schema and preserve drafts after failures | Invalid/valid per category, media cancel/retry, duplicate prevention, server persistence, return to created item |
| `/(tabs)/social` (Communities) | Discover and manage community membership | Public community list and joined-community query exist. The old “Following” label described joined communities, not people; renamed to Discover/Joined on this branch | Join/leave, private/request states, membership persistence, community detail, permission-denied UX |
| `/(tabs)/inbox` (new tab) and `/messages` (legacy entry) | Read conversations and send messages | Existing messaging screen reused by new Inbox tab; no duplicated messaging implementation intended | Inbox load, message requests, send/receive, unread/read state, realtime reconnect, conversation deep link |
| `/(tabs)/local` | Browse local directory categories | Duplicates the Explore/Radar discovery domain; hidden from primary tab bar on this branch, but the legacy route still exists and needs canonical redirect/route migration | Legacy `/local` resolves to Explore without breaking `/local/[id]` business details |
| `/post/[id]` | Read a post, comment, react, save, share, report, edit/delete own post | Detail and interaction implementation exists | Missing/deleted/private post, paginated comments, unauthorized actions, mutation rollback and server-confirmed state |
| `/edit-post/[id]` | Edit own content | Route exists | Owner-only access, validation, media preservation, save failure and success redirect |
| `/public-profile/[id]` | View a person, follow, message, Buddy, block/report | Profile and relationship actions exist in source; network failure, blocked/private visibility and counts need cross-account validation | Self/other/private/blocked profiles, follow counts, message entry, report/block, pagination |
| `/profile` | Edit own identity, avatar, bio, interests and appearance | Self-edit screen exists; it must be the obvious destination from the home avatar and must load/save durable profile data | Avatar upload/signed URL, validation, username availability/cooldown, persistence after restart, logout |
| `/account-settings`, `/personal-details`, `/settings` | Manage account, privacy and preferences | Settings are spread across several routes; consolidate by task without deleting working deep links | Each setting has one canonical owner and persisted source; legacy routes redirect safely |
| `/saved` | Find saved posts | Saved-content screen exists | Save/unsave consistency, account isolation, deleted/private content, empty/error state |
| `/notifications` | Review and clear activity | Notification screen exists | Read/unread persistence, correct destinations, stale/deleted target handling |
| `/buddies` | Manage Buddy requests/relationships | Dedicated screen exists | Incoming/outgoing/accepted/rejected states, duplicate requests, block interaction |
| `/community/create`, `/community/[id]`, `/community/post`, `/community/settings/[id]` | Create, participate in, post to and moderate communities | Routes and related controls exist; permission and RLS parity require two-account tests | Public/private join paths, member/moderator/owner actions, post publishing, rules, unauthorized negatives |
| `/local/[id]` | View a local business | Business detail exists; it is not a universal detail page for event/deal/job/service/alert | Correct category-specific detail route and configured contact actions only |
| `/business-profiles`, `/business-setup`, `/business-team`, `/business-invite`, `/business-verification` | Set up and manage a business | Multiple routes exist; do not imply verification/team capabilities beyond server-enforced state | Owner/team permissions, invitation expiry/acceptance, public profile persistence, verification status |
| `/menu` | Access secondary destinations and sign out | Secondary menu exists; avoid duplicating primary destinations and profile editing | Every row routes correctly, sign-out confirmation, auth return path |
| `/feedback` | Send product feedback | Route exists | Validation, submission state, privacy-safe payload, retry |
| `/account-intent` | Select personal/business account intent | Route exists | Persist selection, correct business onboarding, back navigation |
| `/admin-yoco` | Manage payment operations | Admin route exists; must not be discoverable/usable without server-enforced admin permission | Unauthorized denial and audited admin access |
| `/dev/theme-lab` | Developer-only theme inspection | Development utility route exists | Excluded/guarded in production navigation |
| `/community/settings/[id]` | Change community settings | Route exists | Owner/moderator permission matrix and persistence |

## Confirmed issues to fix

### P0 — broken task flow / correctness
1. Explore cards are not pressable and do not navigate to their detail screen. This is a confirmed source-level issue.
2. Category-specific detail routes are incomplete: `/local/[id]` is business-only, while Explore can return posts, alerts, businesses, events and deals. Do not route all types to a business screen or pretend the detail exists.
3. The own-profile avatar in Home opened the global menu. Fixed on this branch by separating the menu action from the profile avatar.
4. Top-level destinations duplicated discovery and mixed communities with messaging. This branch changes the main destinations to Home, Explore, Create, Communities and Inbox, keeps the old Local route hidden for migration, and reuses the existing message implementation for Inbox.
5. The Communities segment called “Following” while showing community memberships. Fixed on this branch by naming the segments Discover and Joined.

### P1 — consistency and recovery
- Ensure every interactive card/action has an accessible name, clear pressed/disabled/loading state, and a real destination.
- Consolidate theme, discovery settings, profile settings and social mutations around their existing authoritative providers/repositories; do not add parallel sources of truth.
- Standardize loading, empty, offline and error states; preserve form input after recoverable failures.
- Ensure private profiles, blocked users, membership roles and owner actions are enforced by Supabase/RPC/RLS, not only hidden in UI.
- Use South African formatting (ZAR, local date/time) and never fabricate ratings, verification, distances, opening status or social proof.

### P2 — visual quality
- Apply a consistent semantic spacing/type/color/radius scale, shared buttons/inputs/rows/avatars, and consistent card density.
- Verify minimum 44–48 dp primary targets, readable dynamic text, contrast, screen-reader labels and web keyboard/focus states.
- Keep content-first feed cards compact; reserve contained cards for media/listings; avoid repeated oversized panels and decorative empty states.

## Required verification before calling the overhaul complete

- [ ] Route inventory and navigation-target audit with no unresolved destinations.
- [ ] TypeScript, lint, unit/integration tests, interaction audit, production invariant audit, Expo validation and Android debug builds pass on the branch.
- [ ] Every primary tab and every screen's primary/secondary actions has a written Given/When/Then acceptance case.
- [ ] Two-account tests for follow/block/report, comments/reactions/saves, community membership/moderation, messaging and privacy.
- [ ] Live Supabase reads/writes and RLS negative tests; do not substitute local cache or seed data for server truth.
- [ ] Physical Android smoke tests: fresh install, login, profile avatar upload, create post/photo, Explore detail navigation, community join/post, inbox send/receive, notifications, back stack and restart.
- [ ] Small-screen and large-text visual QA; dark/light themes; offline/error recovery.
- [ ] Do not call launch-ready until the above critical gates have evidence.
