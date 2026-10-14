# Lekka UX/UI Research and Overhaul Plan

**Status:** Research and route audit complete; implementation must follow the acceptance gates below.  
**Scope:** Native-first Expo/React Native application, responsive web, Supabase-backed social and local discovery.  
**Principle:** One interaction, one owner, one canonical data path. A visual redesign is not complete unless every control works end-to-end.

## 1. External research

Research was performed against primary platform and platform-guideline sources on 14 October 2026. The goal is to learn interaction conventions, not copy another company's visual identity.

### Patterns to adopt

| Platform / source | Evidence-based pattern | Lekka application |
|---|---|---|
| Instagram / Meta | Familiar, persistent primary navigation; media-first feed; profile identity and content are quickly scannable. Meta's Instagram Lite research found that hidden gestures confuse less experienced users and explicit controls improve discoverability. | Keep core destinations visible, label controls, don't make essential actions gesture-only. Use compact post rows and media only when a post contains media. |
| TikTok | A clear discovery-first feed that learns from interactions and makes recommendations feel distinct from following content. | Keep recommendation and following modes explicit; filters must change actual query/results, not just selected styling. |
| X | Profile and timeline layouts prioritize scanability and persistent access to relevant profile content. | Profile summary first, tabs for posts/media/about only where each has unique data; avoid repeated profile/settings shortcuts. |
| Reddit | Communities are a core content hierarchy, not just a generic tab or list of unrelated cards. | Community identity, membership state, rules, posts, and moderation actions should be in one coherent community surface. |
| Discord | Dedicated accessibility settings and consistent, discoverable navigation; accessibility is treated as a product concern. | Group preferences by task, provide explicit labels/states, ensure touch/keyboard/screen-reader access. |
| Apple Human Interface Guidelines | Tabs represent top-level destinations, not actions; preserve each tab's navigation state; keep labels; avoid overflow and too many destinations. | Use a stable set of five or fewer high-value destinations; Create is a clearly styled action but must not duplicate another create entry point with different behaviour. |
| Material Design / Android accessibility | Bottom navigation is suited to 3–5 top-level destinations; items need icon and label; touch targets should be at least 48 dp. | Make all primary targets reliably tappable, label icon-only controls for assistive technology, and keep consistent selected states. |
| W3C WAI navigation guidance | Consistent navigation, meaningful labels, visible state, keyboard/touch/speech support, and bypassing repeated navigation improve usability. | Add consistent focus/pressed/selected states, accessible names, predictable back behaviour, and no dead-end screens. |

### Primary references

- Apple Human Interface Guidelines — Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars/
- Apple Human Interface Guidelines — Navigation and search: https://developer.apple.com/design/human-interface-guidelines/navigation-and-search/
- Meta — Instagram Lite research and explicit interaction cues: https://www.meta.com/design-at-meta/blog/instagram-lite-a-global-collaboration-between-research-and-design/
- TikTok — How the For You feed works: https://www.tiktok.com/safety/en/making-your-feed-for-you
- X — Profile scanability and persistent profile navigation: https://blog.x.com/en_us/a/2015/designing-the-new-twitter-profiles
- Discord — Accessibility statement: https://discord.com/accessibility-statement
- Discord — Accessibility settings: https://support.discord.com/hc/en-us/articles/1500010454681-Accessibility-Settings-Tab
- Google / Android — Touch target size: https://support.google.com/accessibility/android/answer/7101858
- W3C WAI — Navigation design: https://www.w3.org/WAI/curricula/designer-modules/navigation-design/


Additional primary references reviewed:

- Meta — Facebook Home vs Feeds: separate discovery recommendations from content from people and groups the user follows: https://about.fb.com/news/2022/07/home-and-feeds-on-facebook/
- Meta — Facebook feed, search, navigation and streamlined creation updates: https://about.fb.com/news/2025/12/making-it-easier-to-create-discover-and-share-content-on-facebook/
- Meta — Threads Communities and community discovery: https://about.fb.com/news/2025/10/introducing-threads-communities-find-your-people/
- Meta — Threads custom feeds and quick access to saved/liked content: https://about.fb.com/news/2025/04/new-features-threads-web-experience/
- Pinterest Help — Search suggestions, content-type filters, and visual discovery: https://help.pinterest.com/en/article/search-for-ideas-on-pinterest
- YouTube Help — Separate Subscriptions, notifications, and Library/history destinations: https://support.google.com/youtube/answer/2398242?co=GENIE.Platform%3DAndroid&hl=en
- LinkedIn Help — Profile/account settings through the profile entry point, and distinct Home, Network, Messaging, Notifications and Jobs destinations: https://www.linkedin.com/help/recruiter/answer/a528037

These comparisons reinforce a key distinction: destinations should be separated only when they represent genuinely different user jobs. Home recommendations versus following feeds can be separate modes; local discovery categories belong under one Explore destination; direct messaging should not be hidden inside a Communities screen; saved content and account controls belong in predictable secondary navigation.

## 2. Current app audit (repository inspection)

### Confirmed structure

The app is Expo Router / React Native, not a web-only React app. The current five bottom destinations are **Home, Radar, Create, Social, Local**.

- Home (app/(tabs)/index.tsx) owns the feed, recommendation segments, reactions, saves, notifications count, profile identity display, and local settings lookup.
- Radar (app/(tabs)/nearby.tsx) owns location/radius/content-type filters and nearby results.
- Local (app/(tabs)/local.tsx) independently owns local directory search and category filters for businesses, deals, events, marketplace, jobs, and services.
- Social (app/(tabs)/social.tsx) combines Communities, Following, and Messages as an in-screen segment.
- Create (app/(tabs)/create.tsx) owns post, alert, event, and listing creation.
- The separate menu (app/menu.tsx) links to Buddies, Communities, Saved, Notifications, Local Radar, Account settings, and Beta feedback.
- Profile (app/profile.tsx) owns profile editing, theme selection, and some local profile preferences.
- Account settings (app/account-settings.tsx) separately owns username history and privacy settings.
- Personal details (app/personal-details.tsx) is another account surface.
- Theme plumbing exists in lib/_core/theme.ts, constants/theme.ts, lib/theme-provider.tsx, and hooks/use-colors.ts.

### Confirmed redundancy risks

1. **Radar vs Local overlap.** Both are bottom tabs, both use location/discovery, and both expose overlapping categories. A user has to guess which one contains posts versus local services.
2. **Communities and Messages are hidden inside Social, but also exposed as separate destinations elsewhere.** The menu has a Communities shortcut and a Notifications shortcut; message access is both a Social segment and a header button.
3. **Settings are split across Profile, Account settings, Personal details, and local storage modules.** Users may not know where a preference belongs.
4. **Username-change history has client-local and server-backed helpers.** The account-settings screen reads server history, while profile code imports local history and server history helpers. This needs a single authoritative server-backed history for authenticated account changes; local state may only be a cache, never the authority.
5. **Theme ownership is split between the central ThemeProvider and consumers.** useColors reads the system color scheme directly, while ThemeProvider tracks colorScheme and themeId. This risks controls changing one source while screens render from another. Theme selection and resolved palette must have one context-backed source.
6. **Shared data and screen logic are mixed.** Feed and discovery screens import local-radar settings and multiple repositories directly. The overhaul must not duplicate query/mutation logic inside visual components.
7. **The menu is a second navigation inventory.** It contains links to destinations already represented in bottom navigation. Secondary navigation needs a clear hierarchy rather than another parallel map of the app.

These are architecture and interaction risks found by source inspection; they are not claims that every route currently fails at runtime.

## 3. Proposed information architecture

### Primary navigation (five destinations maximum)

1. **Home** — one feed with explicit For You / Following filters. Nearby is a filter or context, not a second competing feed destination.
2. **Explore** — one unified local discovery surface for posts, businesses, deals, events, jobs, marketplace, services, and alerts. Search, location, radius, and content filters live here once.
3. **Create** — one creation entry point with post type selected inside the composer. Every creation shortcut routes into this same composer and shares validation/upload logic.
4. **Communities** — community discovery, joined communities, community details, and rules/moderation in one clear hierarchy.
5. **Inbox** — direct messages and message requests. Notifications remain a separate destination reached from a consistent header/menu action, not a hidden segment of Communities.

Profile is reached from the user's avatar in the Home/header and the global account menu. Saved, Buddies, Notifications, and settings are secondary destinations with clear back navigation. No duplicate destination may implement its own version of the same action.

**Migration constraint:** Keep existing route URLs working while redirecting duplicate entry points to the canonical destination. Do not delete a route until all incoming links and tests are migrated.

## 4. Settings information architecture

One Settings root, grouped by user intent. Each setting appears once.

- **Your account:** email/authentication, password/security, username and change history, personal details, account intent, sign out, delete account.
- **Profile:** display name, avatar, bio, interests, public profile visibility.
- **Privacy and safety:** private account, location precision/visibility, friends/following visibility, blocked accounts, message requests, content/reporting controls.
- **Notifications:** push permission status, in-app notification categories, per-category toggles, quiet/marketing options only if implemented.
- **Location and discovery:** home area, precise/approximate location, radius, discovery content preferences. A single settings repository must own persisted preferences.
- **Appearance and accessibility:** system/light/dark theme, brand palette, text scaling if supported, reduce motion if supported, contrast, haptics if supported.
- **Business tools:** active business identity, business profile, team/members, verification, listings, payments/subscriptions where applicable.
- **Help and legal:** feedback, help, terms, privacy policy, app version.

A row is not launch-ready merely because it renders a switch. It must load the saved value, persist the change, surface errors, and reflect the saved value when revisiting the screen. If a capability is not implemented, do not show a fake/inert setting.

## 5. Premium visual system

- **Hierarchy:** page title, one clear primary action, then compact sections. Avoid oversized hero cards for routine settings and feed metadata.
- **Content density:** social feeds use a consistent author/time row, readable body, media at natural aspect ratio, and a compact action row. No card wrapper around every text block. Use separators and whitespace to establish grouping.
- **Surface rules:** cards are reserved for content that benefits from containment (media, listings, dialogs); use flat rows for settings, menus, and navigation.
- **Spacing:** establish a small spacing scale and use it everywhere; do not hand-tune margins screen by screen.
- **Typography:** one type scale, clear title/body/caption roles, limited weights, line-height tuned for mobile reading.
- **Color:** one canonical semantic palette with contrast-tested foreground/background, muted, border, primary, success, warning, and error tokens. Brand themes may change tokens, not component logic.
- **Controls:** shared button, icon button, text field, segmented control, row, empty/error/loading state, sheet/dialog, avatar, and post-action components.
- **Motion:** short, purposeful state transitions; no animation that delays navigation or hides state changes.
- **Responsive:** safe areas, keyboard avoidance, dynamic text, narrow widths, tablet layouts, and web focus/hover states.
- **Accessibility:** minimum 48 dp targets where possible, explicit labels, visible focus/selected/pressed states, screen-reader announcements for async outcomes, and no essential gesture-only actions.

## 6. Single-source-of-truth rules

1. **Theme:** one ThemeProvider/context is authoritative for theme ID, light/dark mode, and resolved tokens. useColors must read from that provider; no independent system scheme in screens.
2. **Navigation:** one typed route/destination registry supplies menu links, header actions, and test expectations. Aliases redirect; they do not reimplement screens.
3. **Auth/session:** one auth hook/session source; no screen-local shadow copy of user identity.
4. **Profile:** validated profile repository/RPC is the only write path; local data is cache only.
5. **Settings:** typed settings schema + one repository per persisted domain, with clear separation between server-owned account/privacy settings and device-only preferences.
6. **Reactions/saves/follows:** one mutation repository per action, with optimistic state rollback on error and a single database RPC contract.
7. **Discovery:** one canonical query/filter model and one discovery repository; UI surfaces can have different presentation but not different definitions of radius, content types, or location scope.
8. **Design tokens/components:** one token source and shared components; remove duplicate local implementations after migration.
9. **Errors/loading/empty states:** common presentation contract; no swallowed errors or success toast before server confirmation.
10. **No dead controls:** every visible button/toggle/link has an implementation and a test; otherwise hide it until ready.

## 7. Required audit and acceptance gates

### Navigation and information architecture
- Every route is reachable from one obvious location.
- Back always returns to the previous meaningful context; no plain-text hyperlinks masquerading as controls.
- No duplicate tabs or parallel settings pages.
- Deep links and existing URLs redirect safely.

### Core user journeys
- Sign up, sign in, sign out, password reset, OAuth callback, onboarding.
- View feed, refresh/paginate, create post with/without media, edit/delete own content.
- Like, unlike, switch reaction, save/unsave; counts and UI reconcile with server response.
- Comment and share.
- Edit profile/avatar/personal details; values survive app restart.
- Browse local discovery; change category, query, radius and location; errors and empty results are distinct.
- Create/join/leave community; view community content and permissions.
- Send/accept/reject message requests; send and receive messages.
- Notification read state.
- Privacy, blocking, account visibility, location visibility.
- Business profile/team/verification and payment surfaces that are exposed in UI.

### Quality gates
- TypeScript check, lint, unit tests, interaction audit, production-invariants audit, security/RLS checks.
- Route inventory and duplicate-navigation test.
- Accessibility audit for minimum targets, labels, focus, contrast, dynamic text.
- Screenshot review on small Android, large Android, and web.
- No seeded/demo data in production paths unless clearly marked as development-only.
- Every error is actionable and preserves the user's input.
- Do not call the app launch-ready until critical journeys have been tested against the live backend and the packaged app.

## 8. Implementation order

1. Lock this architecture and build a route/action inventory from all app/ files.
2. Establish design tokens and a shared component layer.
3. Consolidate theme, navigation, settings, discovery, and social mutations to one source each.
4. Redesign the shared shell (header, bottom navigation, global menu) before individual screens.
5. Redesign Home, Explore, Create, Communities, Inbox, Profile, Settings.
6. Add interaction tests as each slice is migrated; remove old paths only after regression checks.
7. Run visual QA and end-to-end acceptance gates. Fix regressions before moving on.

**Do not perform a cosmetic-only pass.** Every design change must preserve or improve the real backend workflow and have a verification path.


## Category-specific experiences

See [Category-Specific UX/UI Specification](./CATEGORY_SPECIFIC_UX_UI_SPEC.md) for research-backed, field-level UI contracts for Marketplace, Businesses, Deals, Events, Jobs, Services, Communities, Local Alerts and general posts. It also documents the data-model gap: generic post fields are not sufficient for persisted price, sold state, event times, offer terms, job application settings or service pricing. Do not fake these fields in the client; inspect the live schema and implement typed persistence, RLS, lifecycle transitions and category-specific cards/details together.
