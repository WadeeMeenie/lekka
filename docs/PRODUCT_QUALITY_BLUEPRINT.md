# Lekka Product Quality Blueprint

**Research date:** 14 October 2026  
**Purpose:** Turn lessons from mature social platforms and their public engineering work into a coherent, testable product standard for Lekka. This is a product and engineering guide, not a proposal to copy another platform's visual identity.

## Product position

Lekka is a **local utility network**: people discover what's happening nearby, connect with neighbours, participate in communities, and find local businesses, services, deals, events, jobs and items for sale. The app must make each task obvious and trustworthy. It should not feel like a generic social feed with category stickers.

## Research reviewed

### Meta / Facebook / Instagram

- **Astryx design system:** https://github.com/facebook/astryx
- **StyleX styling architecture:** https://github.com/facebook/stylex
- **Instagram recommendation engineering:** https://engineering.fb.com/2025/05/21/production-engineering/journey-to-1000-models-scaling-instagrams-recommendation-system/
- **Facebook Home vs Feeds:** https://about.fb.com/news/2022/07/home-and-feeds-on-facebook/
- **Instagram Lite research and explicit interaction cues:** https://www.meta.com/design-at-meta/blog/instagram-lite-a-global-collaboration-between-research-and-design/

**Lessons for Lekka**
1. Use a coherent design system with semantic tokens, reusable components, accessible states, and predictable theming. Astryx and StyleX are web/React-focused and are research references; do not pull them into Expo/React Native just because they come from Meta.
2. Keep discovery recommendations distinct from content users explicitly follow. Do not pretend a tab is personalized if it only changes its visual selected state.
3. Make important actions visible and understandable; don't rely on hidden gestures.
4. Treat feed ranking as a layered, measurable system. At Lekka's current scale, prioritize transparent chronological/nearby/following filters and fast, correct queries before building complicated ML ranking.

### Reddit

- **Post flair:** https://support.reddithelp.com/hc/en-us/articles/15484545678996
- **Community settings and guides:** https://support.reddithelp.com/hc/en-us/articles/15484546290068
- **Moderator actions:** https://support.reddithelp.com/hc/en-us/articles/15484284113172

**Lessons for Lekka**
1. Communities need a purpose, rules, membership state, post types, and moderation controls—not just a list of posts.
2. Category/flair labels should support navigation and filtering, not merely decorate cards.
3. Report, remove, lock, and distinguish actions must be permission-gated, auditable and reflected in the UI after the server confirms the result.
4. Distinguish platform/business verification from a generic trust score. Never imply a person or business is officially verified without a real verification source.

### Discord

- **Community setup and roles:** https://github.com/discord/discord-api-docs/blob/main/developers/game-development/how-to-create-a-community-for-your-game.mdx
- **Permissions:** https://github.com/discord/discord-api-docs/blob/main/developers/topics/permissions.mdx
- **Accessibility statement:** https://discord.com/accessibility-statement

**Lessons for Lekka**
1. Start with a small, understandable role model: member, community moderator, business owner, and platform administrator as separate capabilities where the current schema supports them.
2. UI visibility is not authorization. Supabase RLS and server-side checks must enforce the same permissions.
3. Show clear permission errors and never leave a failed action looking successful.
4. Make touch targets, labels, focus order, contrast and screen-reader announcements part of acceptance testing.

### Bluesky

- **Open-source social app (web, iOS and Android):** https://github.com/bluesky-social/social-app
- **Moderation model:** https://github.com/bluesky-social/bsky-docs/blob/main/docs/advanced-guides/moderation.md

**Lessons for Lekka**
1. User safety needs multiple layers: platform enforcement, content labels, and user-level mute/block controls.
2. Users should understand why content is hidden or restricted and have control over their experience where appropriate.
3. Media accessibility is a publishing concern. Support useful alt text and don't treat image-only posts as accessible by default.
4. Keep moderation logic and data access separate from visual components so it can be tested independently.

### Other established product conventions

- **TikTok For You feed:** https://www.tiktok.com/safety/en/making-your-feed-for-you — make recommendation surfaces distinct and explainable.
- **Apple tab bars:** https://developer.apple.com/design/human-interface-guidelines/tab-bars/ — reserve primary navigation for a small number of stable top-level destinations.
- **Google Business Profile:** https://business.google.com/en-all/business-profile/ — businesses need complete, current identity, contact, hours, service area and media.
- **Eventbrite event details:** https://www.eventbrite.com/help/en-us/articles/193464/ — events need clear time, place, organiser and ticket/entry details.
- **LinkedIn job posting:** https://www.linkedin.com/help/linkedin/answer/a6542541 — jobs need a real application method and transparent requirements.
- **Google Android touch targets:** https://support.google.com/accessibility/android/answer/7101858 — controls must be large enough and easy to operate.

## Lekka interaction contract

Every screen and control must satisfy all of these:

1. **One source of truth.** Supabase is authoritative for published content, identities, permissions, reactions, membership and lifecycle state. Local storage is for drafts/cache only. Cache cannot resurrect deleted records or override a server-confirmed state.
2. **Action → result → confirmation.** Disable duplicate submission while an action is pending, show progress, handle errors without discarding input, and update the UI only after server success or a deliberate rollback-capable optimistic update.
3. **No fake controls.** If a button, badge, link, count, filter, sort, call-to-action or status is visible, it must work and reflect real data. If a capability isn't wired, hide it or clearly mark it unavailable.
4. **Identity is real.** Resolve the actual profile/business avatar and display name. Initials are a graceful fallback only when no usable avatar exists, never a substitute for a failed query that should have returned one. Verification marks require real evidence.
5. **Category-specific UI.** Marketplace, business, deal, event, job, service, alert, community and general-post experiences each need the right fields, card hierarchy, filters, detail view and lifecycle controls. Shared components should not flatten different tasks into one generic layout.
6. **Permissions are enforced twice.** UI actions are hidden/disabled when the user lacks permission; RLS/RPC/server authorization is the actual security boundary. Test negative cases for anonymous users, other users, business owners and moderators.
7. **Accessible by default.** Every control has a label and state, minimum touch size, sufficient contrast, keyboard/focus behaviour on web, screen-reader behaviour on native, reduced-motion respect, and alt text support for meaningful media.
8. **South African by default.** Use ZAR for money, local date/time formatting, suburb/area-level public location, and no public exposure of private home addresses. Do not fabricate ratings, opening hours, salaries, discounts, distances, verification or social proof.
9. **Fast on ordinary devices and networks.** Paginate feeds, avoid N+1 requests, lazy-load media, size/crop images appropriately, cache signed media safely, preserve drafts on transient errors, and provide honest loading/empty/offline/error states.
10. **One coherent design language.** Use semantic color/spacing/type/radius/elevation tokens; consistent component states; restrained emphasis; and clear content hierarchy. A premium interface is calm, predictable and useful—not merely gradients, shadows or animations.

## Priority order for implementation

### P0 — correctness, security and release safety
- Fix profile/business avatar hydration and signed-media failure handling; test a real post from an account with an avatar.
- Resolve outstanding Supabase security advisor findings, including the spatial_ref_sys grants/RLS issue, with an extension-safe fix and verification.
- Verify RLS for posts, profiles, post media, reactions, comments, saved posts, businesses, deals, events, communities and memberships.
- Ensure feed filters and category selectors change actual server results.
- Ensure delete, report, block, mute, reaction, save, comment and Marketplace lifecycle transitions persist and handle failures correctly.
- Remove all development/test data from the live feed and prevent stale caches from bringing it back.

### P1 — premium core journeys
- Home: explicit For You / Nearby / Following intent, search, clear filters, stable feed pagination, skeleton/empty/error states.
- Create: one short flow with progressive category-specific fields, validation, draft preservation and upload progress.
- Post cards: consistent header/action layout; media only when available; concise category-specific metadata; no placeholder claims.
- Profiles: dependable avatar, display name, bio, area, content tabs and account/privacy entry points.
- Marketplace: price in ZAR, condition, seller, area, available/reserved/sold state, owner controls and a real buyer contact path.
- Businesses: actual business identity, logo, contact, hours, area and configured actions only.
- Communities: clear purpose/rules, join state, post types and moderator actions based on permissions.

### P2 — polish and growth
- Empty states with a useful next action, not decorative illustrations alone.
- Search suggestions and meaningful filters.
- Accessible media descriptions, notification preferences and mute/block controls.
- Visual regression screenshots for light/dark themes, small Android screens, large text and web.
- Product analytics for successful tasks and errors, with privacy-aware collection and no sensitive content in logs.

## Release gates

A feature is not complete because it renders. For each core journey, capture evidence of:
- Given/When/Then acceptance tests;
- valid success path and invalid/unauthorized path;
- persisted backend state and refreshed UI state;
- loading, empty, offline and error states;
- TypeScript, lint, unit/integration tests, Expo validation and Android native build;
- manual visual QA on a real Android device and responsive web;
- security advisor review and migration rollback/forward strategy where applicable.

**Do not declare production or launch readiness until P0 gates pass and the actual packaged app has been smoke-tested.**
