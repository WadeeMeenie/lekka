# Lekka — Full Product Interrogation & Reality Audit

**Audit type:** Source, schema, configuration, test, and previously recorded environment evidence review.  
**Scope:** Current repository state at the time of audit.  
**Rules followed:** No application code, database migration, seed data, or APK build was performed for this audit.

## Executive verdict

> **Verdict: A functional MVP foundation, not a private-beta-ready social network.**

Lekka has a credible hyperlocal concept, a polished onboarding shell, real Supabase authentication, a real profile model, a real location engine, a real PostGIS-backed discovery architecture, and a working text-post creation path. However, most of the product surfaces that make a social network social—post detail, comments, persistent reactions, saves, profile-to-profile navigation, follow UI, messaging, notifications, moderation flows, and live local-business experiences—are absent or only partially represented. The application currently feels like a branded discovery prototype wrapped around a partially connected backend rather than a complete social product.

The strongest truth is that **location-aware discovery and authentication are real at the architecture level**. The strongest product failure is that **the visible five-tab experience promises much more than the current interactive implementation delivers**. The product has no verified physical-device behavior in the available evidence, no authenticated A/B CRUD validation, and no seed dataset in the remote project. Therefore, a successful TypeScript check, deterministic test suite, or APK build must not be interpreted as proof that real multi-user behavior works.

## Evidence conventions

The report distinguishes the following states.

| Label | Meaning |
|---|---|
| **WORKING** | Implemented in source and connected to a real path, with the available automated or environment evidence supporting the claim. |
| **PARTIAL** | Some real implementation exists, but an important UI, backend, error, persistence, or verification layer is missing. |
| **PLACEHOLDER** | UI or local fixture exists, but the visible behavior is not connected to the corresponding production data path. |
| **NOT IMPLEMENTED** | No current user-facing implementation was found. |
| **NOT DEVICE VERIFIED** | The feature may exist in source, but no physical Android-device execution evidence is available. |
| **UNKNOWN / NOT VERIFIED** | The repository or available evidence is insufficient to make a reliable claim. |

Primary source references are listed at the end. Line references point to the repository files inspected for this audit; previous environment facts are explicitly identified as recorded verification evidence rather than inferred from UI appearance.

# 1. What Lekka is

Lekka is intended to be a South African hyperlocal social network: a location-first place where people discover what is happening nearby, share useful local information, find businesses and events, participate in communities, and eventually connect through local commerce and social interaction. The current implementation communicates that proposition through the Home feed, Local Radar, Create, Social, and Local tabs.

The target user is a person who wants useful, timely information about the area around them rather than a globally ranked entertainment feed. The concept is especially relevant to residents, visitors, community organisers, local businesses, and people looking for local alerts, events, deals, jobs, services, or marketplace items.

The problem Lekka is trying to solve is fragmentation. A resident may need separate Facebook groups, WhatsApp groups, Google Maps, community-watch channels, business pages, and classifieds to understand what is happening within a few kilometres. Lekka’s proposed advantage is a single, privacy-aware local layer that combines social posts, local discovery, approximate distance, businesses, alerts, events, and community activity.

The current product does **not yet prove a compelling replacement** for Facebook, Instagram, TikTok, WhatsApp, X, Google Maps, or Nextdoor because the alternatives have mature content volume, identity graphs, messaging, search, moderation, and notification loops. Lekka’s defensible advantage could become **high-signal, current, location-ranked South African local information with privacy-safe distance and area presentation**, but that advantage is not yet protected by a working network effect.

Within ten seconds, a new user should understand: **“Lekka shows me useful things happening around where I am.”** The current onboarding communicates this reasonably well. The reason to return tomorrow is not yet strong enough because there is no dependable live content volume, no notification loop, no following graph, no saved-content loop, and no working community conversation loop in the visible product.

# 2. Exact first-launch experience

The root layout wraps the app in a theme provider, safe-area provider, query clients, and an `InitialRouteGate`. The route gate loads the local onboarding state and redirects users to `/onboarding` when `completed` is false, or to `/(tabs)` when it is true. Auth and OAuth routes are excluded from the redirect. This is a local AsyncStorage gate, not a server-side onboarding state machine.

## Screen sequence from fresh install

| Order | Screen | Actual behavior | Data/backend | Auth/location | Offline behavior |
|---:|---|---|---|---|---|
| 1 | Welcome | Lekka mark, “What’s happening around you?”, “Let’s go”, sign-in link, and “Continue exploring”. | No request. | No auth; no location. | Works locally. |
| 2 | Location introduction | Explains foreground, privacy-safe location use. “Use my location” requests foreground permission; “Not now” continues. | Expo Location request when used. | Auth not required; location optional. | Not-now path works. |
| 3 | Personalization | Interest chips and six theme choices. Each interest and theme change is locally persisted. | AsyncStorage only at interaction time. | Auth not required. | Works locally. |
| 4 | Account choice | Authenticated users can enter; guests can create an account, sign in, or continue exploring. | Account buttons call Supabase email/password auth when configured. | Auth optional for guest completion. | Guest continuation works locally. |
| 5 | Home tabs | Five-tab shell: Home, Radar, Create, Social, Local. | Home and Radar attempt Supabase reads, then cache/seed fallback. Other tabs are largely presentational. | Home/Radar can use foreground location. Create is gated for guests. | Home/Radar have fallback behavior; other surfaces are mostly local UI. |

The welcome screen has no explicit back button. The location and personalization screens are not standard stack pages with visible navigation controls; their progression is controlled by local state and button actions. Android back behavior is therefore dependent on Expo Router stack history and is **not separately verified on a physical device**. A user can close the app partway through and resume because step, selected interests, selected theme, and some location state are stored under `lekka/onboarding/v1`. The route gate will send an incomplete installation back into onboarding.

The onboarding is technically resumable but has an important product ambiguity: the location captured in onboarding is saved in onboarding state, while Home and Radar primarily load `local-radar/settings/v1`. Onboarding completion does not clearly transfer the captured coordinates into the discovery settings model. The location step therefore behaves as a permission/introduction step, not as a guaranteed end-to-end discovery configuration.

# 3. Onboarding audit

Onboarding is **not mandatory for account creation**, but it is mandatory for reaching the tab shell through the route gate until the user chooses “Continue exploring” or completes the account-choice step. The user can skip location and can continue as a guest. The user can resume because AsyncStorage stores the current step and selections.

The information collected is display preference, interests, approximate/current location when permission is granted, a fallback area, and a preferred-radius string in the onboarding state model. The current visual flow does not present a radius-selection step, so the stored default remains “5 km” unless another screen changes it. The account form collects display name, email, and password; it does not collect username, profile photo, bio, or interests during account creation.

Account creation calls Supabase `signUp` with email, password, and only `display_name` in `raw_user_meta_data`. The database trigger creates a `profiles` row with display name and optional username metadata. The onboarding completion path can later upsert authenticated profile data, including interests and home area, but theme remains local-only. Profile photo is not collected or uploaded.

Location permission denial is handled with a manual/fallback area path. The user is not blocked. This is privacy-friendly, but the product does not consistently make the distinction between **current device location**, **manual exploration**, and **stored home area** prominent enough across the full app.

The most confusing points are:

1. The user is asked for location before being shown what the local feed actually looks like, but the captured onboarding location is not clearly wired into the Home/Radar settings store.
2. “Continue exploring” sounds like a temporary guest action, but it marks onboarding complete locally and sends the user to the tab shell.
3. The account form says “Account created” immediately after a successful Supabase call, but the available source does not surface an explicit email-confirmation state.
4. Themes persist locally but do not sync to the authenticated profile, so users should not expect the same appearance on another device.
5. The app has a profile completion percentage, but the completion model is UI-local and does not represent the full public profile/social state.

# 4. Guest mode matrix

| Action | Guest can do it? | Actual result | Backend required? |
|---|---|---|---|
| Browse Home | Yes, partially | Supabase feed query is attempted; cached or seeded posts can appear. | Optional for fallback; real feed requires Supabase. |
| Browse Radar | Yes, partially | Current location or manual area path; remote RPC when coordinates exist, seeded radar otherwise. | Optional for fallback; real nearby results require Supabase. |
| View posts | Yes, if returned | Home cards render. There is no post-detail route. | Read path may be public or authenticated depending on visibility policy. |
| Open post detail | No | No current post-detail screen or navigation. | Not applicable. |
| View profiles | Own profile preview exists; other profiles do not | Profile screen is a self/profile-preview form, not a public profile viewer. | Own authenticated profile read uses Supabase. |
| Search | Limited local Home filtering | Home search filters already loaded post text/author locally. Local tab search is visual placeholder. | No global search backend. |
| View businesses | Not from current Local UI | Business cards are not loaded in Local. A helper exists but is unused by the visible screen. | Helper requires Supabase. |
| View communities | Social cards are hardcoded | Public-community helper exists but is not consumed by Social. | Helper requires Supabase. |
| View events | Radar seeded card can display an event-like item | No event screen or event repository path is visible. | Schema/RPC exists, UI consumption not verified. |
| View alerts | Seeded/local or post-derived alert can display | Alert presentation exists; no dedicated alert detail or lifecycle. | Posts/RPC may be involved. |
| React | No | Join Lekka gate opens. No persistent reaction operation exists in client repository. | Would require authenticated Supabase write. |
| Comment | No | Join Lekka gate opens. No comment UI or repository helper exists. | Would require authenticated Supabase write. |
| Follow | No | No follow control or public profile flow. A helper exists only. | Would require authenticated Supabase write. |
| Save | No | Join Lekka gate opens. No saved-post screen or repository helper exists. | Would require authenticated Supabase write. |
| Message | No | Social message button opens Join Lekka gate. Messaging itself is not implemented. | No messaging tables/helper. |
| Create post | No | Create tab renders a guest state and Join Lekka gate. | Authenticated Supabase insert required. |
| Upload photo | No | “Add photo” is a non-functional pressable in Create. | Storage helper exists but UI is not wired. |
| Join community | No | Social community cards open Join Lekka for guests, but authenticated join flow is not implemented. | Schema/RLS exists. |

The old confusing message “saved offline until signed in” was replaced in the current Create guest surface by a Join Lekka gate. However, there remains a different and important offline ambiguity for authenticated users: any failed remote post insert falls back to a locally stored item labelled “You · Offline draft”, but there is no queue worker or later synchronization mechanism. This is not a reliable queued-post system; it is a local draft inserted into the same cached-feed list.

# 5. Account creation and authentication

| Field | Current collection | Actual storage | Status |
|---|---|---|---|
| Email | Auth screen | Supabase Auth `auth.users` | Real Supabase auth path; device not verified. |
| Password | Auth screen | Supabase Auth managed credential | Real auth path; not readable by app. |
| Username | Profile screen only | `profiles.username` after profile save | Partial; not collected at sign-up. |
| Display name | Sign-up form and profile | Auth metadata and `profiles.display_name` | Partial/real. |
| Profile photo | No current picker | `profiles.profile_image_path` exists in schema | Not implemented. |
| Interests | Onboarding/profile chips | Local onboarding; authenticated profile upsert to `profiles.interests` | Partial; cross-device only after authenticated save. |
| Theme | Onboarding/profile selector | AsyncStorage `lekka/theme/v1` | Local-only; not synced. |
| Location | Expo foreground permission and runtime `DeviceLocation`; onboarding state stores a location object | Local/runtime; profile has approximate-location column but current profile save does not write it | Partial; end-to-end persistence not established. |

The session client uses the publishable Supabase key only, persists sessions through AsyncStorage, auto-refreshes tokens, and disables URL session detection. The configured project was previously verified as reachable with HTTP 200 on the Auth settings endpoint; this proves environment connectivity, not feature CRUD. No service-role credentials were used in the recorded verification.

Failure handling is generic: the auth screen reports “Could not continue” and asks the user to check details. It does not distinguish invalid credentials, email confirmation, network failure, rate limiting, or duplicate-account errors. Offline sign-up/sign-in do not have an offline queue and should be treated as unavailable until connectivity returns.

# 6. Profiles

The current profile screen is primarily an authenticated self-edit screen. It can load and save display name, username, bio, home area, interests, and a fixed preferred radius of 5,000 metres. It displays a completion percentage derived from four local fields: display name, username, bio, and whether interests are non-empty. It offers six local theme presets and sign-out.

There is no public profile route, no profile-to-profile navigation, no follower/following counts, no public post list, no profile photo picker, no messaging action, no report/block action, and no separate privacy settings screen. The `profiles` table is publicly readable under the migration policy, but the current UI does not expose a public profile experience. The profile percentage is UI-derived rather than a server-side completeness state.

# 7. Home feed

Home is backend-first in the sense that `fetchFeedPosts` first loads cached posts, then attempts either the `nearby_feed_posts` PostGIS RPC when a device location exists or a plain `posts` query limited to 50 rows without location. On remote failure it returns the cache. The cache is AsyncStorage under `local-radar/posts/v1`; if no cache exists, the cache loader returns three hardcoded seeded posts.

The location-aware RPC orders by distance and then creation time. The non-location query orders by creation time. The client then applies `rankPosts`, which uses hardcoded distance-string heuristics, trust, tab-specific scores, and likes for Trending. The For You, Nearby, Trending, and Following tabs are therefore not four independent backend feeds. “Following” is a heuristic that gives a score boost to an author whose name includes “Neighbourhood”; it is not based on the `follows` table. Interests are not used in ranking. Persistent engagement is not queried by the client. There is no pagination.

The Home search field filters the already loaded posts locally. It does not search users, businesses, communities, events, locations, or the full remote corpus. The visible notification bell and avatar are not wired to notification navigation or profile navigation in the current Home source.

The loading skeleton and background-refresh pill are real UI improvements. They do not change the fact that the content source may be cache or hardcoded seed data. No real seed data was intentionally created in the remote Supabase project according to the recorded validation evidence, so a fresh environment may show empty remote results and local fallback content.

# 8. Local Radar

Radar uses Expo Location foreground permission, last-known position when fresh enough, or a current-position request. A 500-metre movement interval and 120-second time interval govern meaningful foreground refreshes. The source does not request background location. If permission is denied or unavailable, the app uses a manual area and attempts a locationless fetch; if no remote rows exist, it displays `seededRadar`.

The radius choices displayed are 500 m, 1 km, 5 km, 10 km, and City. The repository maps City to 25 km. The database RPC itself enforces a minimum of 500 metres. The query uses PostGIS `st_dwithin` against current coordinates and returns up to 100 combined post/business results in `nearby_radar`. The location-first feed RPC returns up to 50 posts within a radius. Four spatial indexes are present in the recorded schema: posts and businesses location indexes in the core migration, plus events and deals location indexes in the local-entities migration.

The current Radar map is a visual approximation, not a real map. It renders decorative roads and three hardcoded pins. There is no map provider, pan/zoom, real marker data, item detail, or route-to-business behavior in the current screen.

A serious schema-level correctness concern exists in the original `nearby_radar` definition: the first migration’s old function calculated distance from each object to itself. The second migration replaces it with a current-coordinate implementation, and the recorded checkpoint states the corrected migration was applied remotely. The current source therefore has the corrected intended RPC contract, but the audit should still treat remote deployment as environment evidence rather than assume every deployment has the same migration state.

Exact user coordinates are not rendered in current cards. The app sends coordinates to the backend RPC, while user-facing labels are area/distance strings. However, the `profiles.approximate_location` and post/business geography fields require careful policy validation, and the migration’s `profiles_public_read` policy is broadly `using (true)`. The available evidence did not establish a complete end-to-end test of every location exposure path.

# 9. Manual location and privacy state

Current-location mode obtains a foreground coordinate, derives a district/city/region through reverse geocoding, sets the active area, and starts a foreground watcher. “Explore elsewhere” offers Bellville, Stellenbosch, and Johannesburg as hardcoded manual choices. The manual selection clears `currentLocation`, sets a temporary override, changes the active area, and refreshes the nearby query. “Use current location” asks for permission again and restores current-location mode when successful.

The UI labels are reasonably explicit—“Using current device location”, “Using Bellville manually”, and “Explore elsewhere”—but the state is not consistently shared across Home, Create, Profile, and Radar. Home reads its own settings/location on mount. Create reads settings at publish time. Onboarding stores a separate location state. There is no unified location context. This can create confusing cross-screen transitions, especially after a manual Radar exploration.

The app does not implement location history or background movement tracking in the source inspected. It does use foreground watch behavior while the relevant screen is active. The exact privacy preference is represented in the database as `location_visibility` values `hidden` or `area`, but there is no current settings UI to change it.

# 10. Create post workflow

The Create screen offers four visual types: Post, Local alert, Event, and Listing. Only Post and Local alert have actual insert semantics in the current handler. Event and Listing are labels that still resolve to a normal post insert with the generic `post` kind unless the type is Local alert.

The user enters text, chooses an audience label, and sees a privacy message. The “Add photo” control is non-functional. There is no video picker, upload progress, media preview, reorder, crop, compression, or retry UI. Publishing obtains current/fallback area, creates a `posts` row with author ID, kind, category, title, body, area, visibility, and optional approximate point, and shows a success alert when the insert succeeds.

If the remote insert fails for any reason, the handler saves a local object into the cached Home post list and reports “You’re offline”. This conflates offline network failure, backend validation errors, authentication errors, schema errors, and server rejection. It does not preserve a robust authenticated draft record, does not retry automatically, does not deduplicate, does not associate the draft with the account, and does not later publish it. The user’s text is cleared after the local fallback.

Guest creation is currently blocked by the guest state and Join Lekka gate. The authenticated flow is text-only and **NOT DEVICE VERIFIED**.

# 11. Media

The source contains an `uploadMedia` helper that reads bytes from an Expo FileSystem `File` and uploads to the private `local-radar-media` bucket with a caller-provided path and content type. The schema contains `post_media` with image/video type, storage path, thumbnail path, dimensions, sort order, and timestamps. Storage policies restrict insert/update/delete to a user-folder convention and allow authenticated reads.

No current visible screen invokes `uploadMedia`. The Create “Add photo” control has no handler. There is no actual photo/video selection, camera capture, multiple selection, preview, resize, compression, thumbnail generation, upload retry, or post-media association flow. Maximum size and content-type enforcement are not expressed in the inspected app code or migrations. Media is therefore **architecturally prepared but not implemented in the user experience**.

# 12. Post detail, comments, reactions, and saves

There is no post-detail route or detail repository function. Home cards are not pressable as a whole; the options chevron is decorative. Users cannot currently inspect a complete author, username, category, media, approximate distance, save state, share action, or report action from a detail screen.

The database contains `comments`, `reactions`, `saved_posts`, and `reports` tables with RLS policies, but the client repository has no comment, reaction, save, report, or post-detail operations. The Home like control increments a local `likes` number and writes the entire transformed post array to AsyncStorage. It does not insert into `reactions`, prevent duplicate reactions, know the current user’s reaction, support removal, or revert when the server rejects an operation. Comment and Save controls open the guest gate when unauthenticated, but authenticated users have no actual persistent operation behind those controls.

Therefore:

| Feature | UI | Backend table | Client operation | Status |
|---|---|---|---|---|
| Post detail | No | `posts`, `post_media` | No | NOT IMPLEMENTED |
| Comments | Count text only; no comment UI | `comments` | No | PLACEHOLDER/PARTIAL |
| Reactions | Local increment for Home like | `reactions` | No | PLACEHOLDER/PARTIAL |
| Saves | Label and guest gate | `saved_posts` | No | NOT IMPLEMENTED |
| Report post/comment/profile | No visible action | `reports` | No | NOT IMPLEMENTED |

# 13. Following and public profiles

The database has a `follows` table with a composite primary key and a self-follow check. The client helper exposes `followUser` and `unfollowUser`, checks that a session exists, and writes/deletes the current user’s follower relationship. There is no public profile route, no follow button, no follower/following count query, no duplicate-state UI, no follow notification, and no integration into Home ranking.

The current “Following” Home tab is not a real following feed. It uses a hardcoded author-name heuristic inside `rankPosts`. This is a material mismatch between label and behavior. Following is therefore **backend-prepared but not a working user feature**.

# 14. Communities

Social displays three hardcoded community cards: Bellville Neighbours, Cape Town Weekend Plans, and Local Makers & Small Business. The screen has Communities, Following, and Messages labels, an invite panel, and a message icon. The public community repository helper can read up to 100 public communities and filter by area, but Social does not call it. There are no join, leave, create, post, comment, moderation, member-count, or community-detail handlers in the visible screen.

The database supports `communities` and `community_members` with public reads and self/owner write policies. That is database capability, not current product functionality. Communities are currently **PLACEHOLDER at the screen level and PARTIAL at the backend level**.

# 15. Businesses, events, alerts, and deals

## Businesses

The schema supports owners, descriptions, logos, covers, approximate locations, address, phone, WhatsApp, website, opening hours, verification state, and business ownership. A helper can list up to 100 businesses and filter by category or verification. The Local tab does not call it. There is no business profile route, claim flow, verification workflow, business dashboard, analytics, advertising, deals editor, messaging, or followers UI.

## Events

The schema supports event owners, business/community association, category, area, approximate location, start/end time, and a nearby-events RPC. The current Local tab’s Events card is not interactive. Radar has seeded event-like content, but the current client fetch path calls `nearby_radar`, whose current implementation combines posts and businesses rather than the separate `nearby_events` RPC. Events are therefore **schema-supported but not a proven current screen feature**.

## Alerts

Local alerts are implemented as a post kind with an alert category/title and a visual reported-alert pill. Authenticated users can create a text alert through Create. There is no dedicated alert detail, lifecycle moderation, official confirmation workflow, expiry handling, or alert-specific notification flow in the visible app. Alerts are **PARTIAL**.

## Deals

The schema supports business-owned deals with start/end times and a nearby-deals RPC. The Local tab’s Deals tile is static, and Create’s Listing/other types do not insert `deals`. Deals are **architecturally present but not implemented in the current user experience**.

# 16. Search

There is no global search. Home’s “Search your local area” filters loaded Home posts by title, body, or author in memory. Local’s search bar is a non-interactive text presentation. There is no search of users, businesses, posts across the remote corpus, communities, events, locations, or categories. Search is **PARTIAL on Home and NOT IMPLEMENTED as a product-wide feature**.

# 17. Notifications

The database contains `notifications` with user ID, kind, title, body, read timestamp, and creation time. Realtime publication includes notifications in the core migration. The current client repository contains no notification list/read/unread functions, no notification screen, no event-to-notification creation logic, no unread count, and no navigation from a notification to content. Home’s bell button has no handler.

Push notification configuration is not implemented in the inspected mobile experience. In-app notifications are therefore **schema/realtime-prepared but NOT IMPLEMENTED**.

# 18. Messaging

Messaging is **NOT IMPLEMENTED**. The Social screen contains a Messages label, empty-state copy, and a message icon that opens a Join Lekka gate for guests, but there is no conversation table, message repository, realtime message subscription, composer, thread, delivery state, or authenticated message flow. The guest gate must not be mistaken for messaging functionality.

# 19. Themes

Six visual themes exist: Lekka Original, Midnight, Sunset, Ocean, SA Vibe, and Neon. The theme provider stores the selected theme ID in AsyncStorage under `lekka/theme/v1`, applies palette variables through NativeWind, and updates browser document variables where applicable. The preference should survive a local app restart because it is stored locally. It does not sync between devices because it is not stored in the profile schema or uploaded by the profile save path.

Most current screens consume `useColors`, but some styles contain hardcoded values, including accent colors, dark text `#10211D`, map colors, and fixed visual colors in cards and icons. The theme is therefore **PARTIAL**: the token system is real, but complete theme coverage is not demonstrated. The current profile screen previews all six themes using the light palette even when the active system scheme is dark, which is a UX inconsistency rather than a data failure.

# 20. Settings and privacy

There is no dedicated Settings screen. The profile screen provides theme, interests, editable profile fields, sign-out, and a fixed 5 km save behavior. There are no visible controls for email/password account management, notification preferences, location permission status, radius persistence through profile, manual exploration, return-to-current location, location visibility, profile visibility, activity visibility, blocked users, reports, terms, privacy policy, or app version.

The database has `profiles.location_visibility` with `hidden` and `area`, but no current settings UI exposes it. The app therefore has a privacy-aware architecture but an incomplete privacy control surface.

# 21. Offline system

| Data/action | Local behavior | Honest classification |
|---|---|---|
| Home posts | AsyncStorage cache; three hardcoded seed posts if cache absent. | PARTIAL. |
| Radar items | Remote RPC when possible; hardcoded `seededRadar` fallback. | PARTIAL. |
| Settings | AsyncStorage area/radius/useLocation/visibility flags. | WORKING locally. |
| Onboarding | AsyncStorage state and selections. | WORKING locally. |
| Theme | AsyncStorage theme ID. | WORKING locally, not cross-device. |
| Auth session | AsyncStorage-backed Supabase session adapter. | WORKING architecturally; device not verified. |
| Authenticated post failure | Saves a pseudo-draft as a cached feed item. | PARTIAL and misleading. |
| Comments/reactions/saves/follows | No local queue. | NOT IMPLEMENTED offline. |
| Media upload | No UI path or queue. | NOT IMPLEMENTED offline. |

There is no synchronization worker, outbox table, retry queue, conflict-resolution policy, account-scoped draft namespace, idempotency key, duplicate prevention strategy for queued posts, or logout/account-switch cleanup protocol. A remote insert failure is treated as an offline draft even when the cause could be invalid data, permission rejection, missing schema, or server error. This is the biggest offline correctness risk.

# 22. Supabase application schema

The migrations define fifteen application tables when the later entities migration is included: twelve core tables plus `business_members`, `events`, and `deals`. RLS is enabled on all listed application tables. The following table records the schema reality and current client use.

| Table | Purpose and important columns | Key / foreign keys | RLS and policies | Current client use |
|---|---|---|---|---|
| `profiles` | Identity, username, bio, photo path, interests, home area, radius, role, approximate location, visibility. | PK `id`; FK `auth.users(id)`. | Public select; self update. | Profile load/save and feed author display. |
| `follows` | Follower graph. | Composite PK `(follower_id, following_id)`; both FK profiles; no self-follow check. | Public read; follower-owned all operations. | Helper only; no visible follow UI. |
| `communities` | Community identity, area, category, visibility, rules, creator. | PK `id`; FK creator. | Public/eligible read; creator-owned all operations. | Hardcoded Social only; helper exists. |
| `community_members` | Community membership and moderator flag. | Composite PK `(community_id,user_id)`; FKs. | Public read; member-owned all operations. | No current join/leave UI. |
| `businesses` | Business profile, contact, hours, location, verification. | PK `id`; FK owner. | Public read; owner-owned all operations. | Helper only; Local UI static. |
| `posts` | Post/alert/event/deal/job/marketplace/service content, visibility, area, approximate location, trust. | PK `id`; author/business/community FKs. | Public/public-nearby/authenticated read; author-owned insert/update/delete. | Feed read and Create insert. |
| `post_media` | Media associations and dimensions. | PK `id`; FK post. | Public metadata read; post-author-owned all operations. | No current UI association. |
| `comments` | Comment body and author. | PK `id`; post/author FKs. | Public read; author-owned all operations. | No client helper/UI. |
| `reactions` | One reaction per user/post. | Composite PK `(post_id,user_id)`; FKs. | Public read; user-owned all operations. | No client helper; Home uses local count. |
| `saved_posts` | User saved-post relation. | Composite PK `(post_id,user_id)`; FKs. | User-owned all operations. | No client helper/UI. |
| `reports` | Reports against posts/businesses with status/reason. | PK `id`; reporter/post/business FKs. | Reporter self-create only. | No report UI/helper. |
| `notifications` | User notification payload and read state. | PK `id`; user FK. | User read/update only. | No client notification UI. |
| `business_members` | Business membership and role. | Composite PK; business/user FKs. | Business-owner-controlled all operations. | No client use. |
| `events` | Event ownership, association, time, area, location. | PK `id`; owner/business/community FKs. | Public read; event-owner all operations. | Separate RPC exists; no visible consumer. |
| `deals` | Business-owned deal, area, time, location. | PK `id`; business FK. | Public read; business-owner all operations. | Separate RPC exists; no visible consumer. |

The tables actually powering visible screens are `profiles`, `posts`, and the location RPCs that read `posts`/`businesses`. `follows`, `communities`, `community_members`, `comments`, `reactions`, `saved_posts`, `reports`, `notifications`, `business_members`, `events`, and `deals` are unused or only partially used by the current visible client.

A schema-level caveat is that public reads are broad in several policies, including profiles, follows, businesses, comments, reactions, post media metadata, events, and deals. That may be intentional for public content, but it is not equivalent to a complete privacy review. The previous recorded remote security review also found the PostGIS-managed `public.spatial_ref_sys` table RLS-disabled and owned by `supabase_admin`; remediation could not be applied through the migration role. This remains an environment/security caveat, not an app feature.

# 23. Storage

| Item | Current reality |
|---|---|
| Bucket | `local-radar-media`. |
| Visibility | Private bucket in the migration. |
| Upload | Authenticated user may insert when the first storage path folder matches their user ID. |
| Read | Authenticated users may read objects in the bucket. |
| Update/delete | User-folder policies exist. |
| Media types | `post_media` constrains image/video values, but UI does not enforce a full media pipeline. |
| Size limits | No application-level maximum found in the inspected source/migrations. |
| Thumbnails | Schema columns exist; generation is not implemented in the visible client. |

The main risk is not an obvious service-role leak—the configured client uses a publishable key—but the gap between private storage policy and public `post_media` metadata reads, plus the absence of a tested end-to-end upload path. Storage policy existence is not proof that upload, association, read, deletion, and authorization work together.

# 24. Realtime

The database publication includes `posts`, `comments`, and `notifications`. The current client creates exactly one channel, `local-radar-live`, listening to all Postgres changes on the `posts` table. Home responds by refetching the feed. There is no client subscription for comments or notifications, no community/business/event/deal realtime path, and no notification event creation logic. The actual realtime implementation is therefore **posts-only refetch**, not a complete social realtime system.

# 25. Security audit

Positive findings:

* No service-role credential is used by the mobile client; it reads the public Supabase URL and publishable key from environment variables.
* Authenticated post insert/update/delete is checked by `auth.uid()` against author ID.
* Business writes are owner-restricted.
* Saved posts and reactions are user-restricted at the policy level.
* Storage writes use a user-folder convention.
* PostGIS functions use security invoker rather than a broad security-definer write path.
* Exact coordinates are not intentionally rendered in visible post cards.

Risks and gaps:

1. Client UI gates are not security. The backend must remain authoritative for every protected operation; many protected operations have no client implementation to test.
2. `profiles_public_read using (true)` exposes all selected profile columns to any reader. Because the table contains approximate location, profile image path, interests, home area, role, and visibility fields, the exact PostgREST projection and remote policy behavior must be validated carefully.
3. `post_media_public_read using (true)` exposes media metadata publicly even though the storage bucket is private.
4. `follows_public_read`, `comments_public_read`, `reactions_public_read`, `businesses_public_read`, `events_public_read`, and `deals_public_read` are broad by design but may reveal relationship or activity information beyond the intended product privacy model.
5. The `follows_self_write for all` policy correctly checks the follower ID, but the current client does not prevent all malformed or duplicate attempts before server evaluation. The primary key prevents duplicates and the schema check prevents self-follow; runtime validation remains untested.
6. Reports are insert-only for the reporter; there is no current moderation UI or operational review workflow in the app.
7. The old extension-owned `spatial_ref_sys` RLS issue remains unresolved in the recorded remote evidence.
8. No A/B authenticated CRUD attack matrix has been executed because confirmed test accounts and a device session were unavailable.

# 26. Performance audit

On low-end Android, the main risks are the repeated full-list AsyncStorage serialization on local likes/drafts, nested horizontal `FlatList`s inside a vertical `FlatList`, the absence of pagination, synchronous transformation of up to 50 feed rows/100 radar rows, reverse geocoding during location changes, and a decorative map that does not yet incur map SDK cost but also does not provide real map functionality. The skeleton animation is lightweight, but it does not address data volume.

On mid-range devices, the app should be acceptable with small datasets, but remote errors can still cause fallback and refetch churn. Home’s realtime post-change callback can trigger a full feed refetch. The location watcher can refresh after movement and the app has no request cancellation or stale-response guard beyond component liveness.

On high-end devices, the major issue is still network and product correctness rather than raw rendering. The lack of pagination and image pipeline will become the dominant issue once real media/content volume arrives. There is no measured performance trace, network budget, cold-start benchmark, or low-end Android test evidence in the available record.

# 27. South African readiness

The product uses South African-feeling examples such as Bellville, Stellenbosch, Johannesburg, rooibos, northern suburbs, local alerts, and rand pricing in seeded marketplace copy (`R850`). It supports area labels and South African-style local discovery concepts. However, the current product does not yet demonstrate comprehensive South African readiness.

Missing or weak areas include a proper province/city/suburb model, robust South African phone validation, language readiness beyond English, locale-aware date/time formatting beyond generic device formatting, data-cost controls, compressed media, realistic local business coverage, and a populated multi-city dataset. The current hardcoded exploration list is only Bellville, Stellenbosch, and Johannesburg. This is enough to signal intent, not enough to validate national usefulness.

# 28. Business-model readiness

The schema can eventually support business accounts through `account_role`, business ownership, business members, verification state, business profiles, events, and deals. It can also support approximate location and category filtering. It does not currently provide sponsored posts, billing, paid radius targeting, ad inventory, analytics, promoted ranking, business followers, business messaging, attribution, or campaign controls.

Interest targeting is represented in profiles but is not used in feed ranking. Sponsored Radar results are not implemented. The architecture is a reasonable starting point for a future local-business product, but no monetizable loop currently exists in the user experience.

# 29. Five user journeys

## User 1: 16-year-old South African discovering Lekka

The user sees the welcome pitch, skips or grants location, chooses interests and a theme, and enters as a guest. They can look at Home and Radar, but remote content may be empty or replaced by local seeded fixtures. They cannot comment, react, save, follow, message, or post. They may conclude that Lekka is a static demo because the social loop stops at the gate.

## User 2: 30-year-old normal consumer

The user can create an email/password account, complete a lightweight profile, and browse location-first surfaces. They can publish text posts or alerts. They cannot open a post detail, read/write comments, persist reactions, save content, or follow authors. The main confusion is that the feed looks social while its most recognisable social controls are not connected.

## User 3: Small local business owner

The user sees a Local tab promising businesses, deals, events, jobs, and services, but the tiles do not open real directories. The schema supports business ownership and verification, and helpers can list businesses, but no business onboarding, claim, verification, publishing, analytics, or deal flow exists. The user has no credible path from discovery to business value.

## User 4: Community organiser

The Social tab presents community cards and a “find your local people” invitation. The database supports communities and members, but the current screen does not load or join real communities. The organiser cannot create a community, publish community posts, moderate, or see members.

## User 5: Visitor to a new South African city

The visitor can use manual exploration and choose one of three hardcoded areas. This is the clearest useful Radar flow. However, the visitor sees seeded fallback cards if live data is absent, cannot search the full city, cannot open details, and cannot build a saved or following itinerary. The product demonstrates the idea but not a reliable travel/local-discovery service.

# 30. Competitive differentiation

| Alternative | Lekka could do better | Lekka currently does worse |
|---|---|---|
| Facebook | More local signal and privacy-safe radius. | Network size, groups, comments, moderation, identity graph. |
| Instagram | Useful local information rather than image-first entertainment. | Media creation, profiles, creator graph, reactions, discovery. |
| TikTok | Less algorithmic entertainment; more utility. | Video, retention loop, volume, creator ecosystem. |
| WhatsApp | Discoverability beyond existing contacts/groups. | Messaging, trust graph, daily habit, group operations. |
| X | Local utility and area relevance. | Live conversation, search, public discourse volume. |
| Google Maps | Community posts and local social context. | Business data depth, maps, reviews, navigation, search. |
| Nextdoor | South African positioning and broader local categories. | Mature neighbourhood network, moderation, notifications, density. |

Lekka should not copy global engagement addiction, exact-location exposure, or noisy follower-count incentives. Its defensible advantage should be **high-signal local relevance, approximate privacy-safe location, South African context, and useful local action**. The current product has the shell of that advantage but not the data density or social loop.

# 31. Missing core features

## Critical before public beta

1. Implement real post detail with author navigation, media, report, share, and location-safe presentation.
2. Implement persistent comments, reactions, saves, and their RLS-backed client operations.
3. Replace the fake Following tab with a real follow graph and ranking integration.
4. Replace local seed fallback as the default public experience with a clearly labelled, useful empty state when no remote content exists.
5. Implement a real profile-to-profile route and public/private profile policy.
6. Add a unified error model that distinguishes offline, authorization, validation, and server failures.
7. Validate authenticated A/B CRUD and location/privacy behavior on physical Android devices.
8. Fix the authenticated offline draft model with account-scoped outbox semantics or stop claiming queued publishing.
9. Add global search or remove the promise implied by the Local search UI.
10. Add a minimum notification loop for comments, reactions, follows, and alerts.

## Important soon

1. Load real communities and implement join/leave.
2. Connect real businesses and business detail screens.
3. Connect events and deals to Local/Radar with expiry handling.
4. Implement media selection, upload, association, compression, and retry.
5. Add settings/privacy controls for location visibility, radius, notifications, and account.
6. Add reports and moderation review operations.
7. Make manual exploration and current-location state global and explicit.
8. Add feed pagination and request cancellation.
9. Add meaningful empty states for followers, saves, notifications, comments, and businesses.
10. Remove or clearly label non-functional tabs, buttons, map pins, and search controls.

## Nice to have later

1. Push notifications after in-app notifications are reliable.
2. Rich reaction types and reply threads.
3. Business analytics and promoted local content.
4. Multi-language South African UI readiness.
5. Real map provider integration.
6. Recommendations using interests once enough real data exists.
7. Visitor itineraries and temporary local collections.
8. Local commerce checkout or lead capture.
9. Community moderation tooling and trusted-contributor reputation.
10. Media-heavy creator and event storytelling.

# 32. What actually works matrix

| Feature | UI exists | Backend exists | Database exists | RLS | Real data | Device verified | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| Onboarding | Yes | Local only | No dedicated state | N/A | Local state | No | PARTIAL / NOT DEVICE VERIFIED |
| Guest mode | Yes | Auth state supports it | N/A | N/A | Cache/seed/remote reads | No | PARTIAL / NOT DEVICE VERIFIED |
| Authentication | Yes | Supabase email/password | Auth + profiles trigger | Yes for profile writes | Auth endpoint verified; CRUD not | No | PARTIAL / NOT DEVICE VERIFIED |
| Profile | Yes | Load/save helper | `profiles` | Yes | Account-dependent | No | PARTIAL / NOT DEVICE VERIFIED |
| Themes | Yes | Local provider | No theme column | N/A | Local preference | No | PARTIAL / NOT DEVICE VERIFIED |
| Location | Yes | Expo Location + RPC inputs | Geography columns | Partially reviewed | Runtime/device-dependent | No | PARTIAL / NOT DEVICE VERIFIED |
| Radar | Yes | `nearby_radar` RPC | Posts/businesses; spatial indexes | RPC invoker/RLS dependent | Remote if seeded; otherwise fallback | No | PARTIAL / NOT DEVICE VERIFIED |
| Home feed | Yes | `nearby_feed_posts`/posts query | `posts` | Yes | Cache, remote, or local seed | No | PARTIAL / NOT DEVICE VERIFIED |
| Posts | Yes for text create/read | Insert/read | `posts` | Yes | No remote seed data recorded | No | PARTIAL |
| Photos | UI label only | Upload helper | `post_media`, storage | Yes | No | No | NOT IMPLEMENTED |
| Post detail | No | No | Underlying tables exist | Underlying policies | No | No | NOT IMPLEMENTED |
| Comments | No real UI | No helper | `comments` | Yes | No | No | NOT IMPLEMENTED |
| Reactions | Local like increment | No helper | `reactions` | Yes | Local count only | No | PLACEHOLDER/PARTIAL |
| Saves | Label/gate only | No helper | `saved_posts` | Yes | No | No | NOT IMPLEMENTED |
| Following | No control | Helper only | `follows` | Yes | No graph UI | No | PARTIAL/NOT IMPLEMENTED |
| Communities | Hardcoded cards | List helper only | `communities`, members | Yes | No live screen data | No | PLACEHOLDER |
| Businesses | Static category tile | List helper | `businesses` | Yes | No live Local screen | No | PARTIAL |
| Events | Static category/seed card | RPC/schema exists | `events` | Yes | No current event screen | No | PARTIAL |
| Alerts | Create/read presentation | Post insert | `posts` alert kind | Yes | Remote depends on data | No | PARTIAL |
| Deals | Static tile/seed-like content | RPC/schema exists | `deals` | Yes | No current screen consumer | No | PLACEHOLDER |
| Search | Home local filter | No global search | Underlying tables | N/A | Loaded cache only | No | PARTIAL |
| Notifications | Bell icon only | No client flow | `notifications` | Yes | No UI data | No | NOT IMPLEMENTED |
| Messaging | Labels/gate only | No | No message table | No | No | No | NOT IMPLEMENTED |
| Offline | Cache and local drafts | No sync engine | N/A | N/A | Local cache/seed | No | PARTIAL |
| Settings | Profile controls only | Profile save | Profile columns | Yes | Account-dependent | No | PARTIAL |
| Privacy | Copy and schema fields | No settings flow | Location visibility column | Yes/partial | Not end-to-end verified | No | PARTIAL |
| Moderation | No current controls | No helper | `reports` | Insert-only | No | No | NOT IMPLEMENTED |

# 33. Top 20 problems

| # | Problem | Why it matters / user impact | Technical cause | Recommended solution | Priority |
|---:|---|---|---|---|---|
| 1 | The social loop is mostly non-functional. | Users cannot comment, save, follow, message, or open details; retention collapses. | Missing client operations and routes. | Build post detail and persistent interactions first. | Critical |
| 2 | Following is a fake ranking mode. | The label promises a network relationship that does not exist. | Hardcoded author-name heuristic. | Implement follow state/counts and ranking inputs. | Critical |
| 3 | No post detail screen. | Cards cannot become durable content objects. | No route or fetch function. | Add detail route, author, media, comments, save/report. | Critical |
| 4 | Remote data may be absent while seed fixtures look real. | Users cannot distinguish demo content from live community activity. | AsyncStorage seed fallback. | Label demo fixtures or use honest empty states. | Critical |
| 5 | Offline post fallback is not a sync queue. | Users may believe a post will publish when it will not. | Failed inserts become cached pseudo-posts. | Build an authenticated outbox or save an explicit draft. | Critical |
| 6 | Local tab is marketing UI. | Business and local-commerce value is not reachable. | No data fetch or navigation. | Connect businesses/categories/detail routes. | Critical |
| 7 | No notification loop. | Users have no reason to return for social activity. | Schema exists; client/event generation absent. | Implement in-app notifications and unread count. | Critical |
| 8 | No public profile graph. | Trust and identity cannot form. | No public profile route or counts. | Add profile route and follow controls. | Critical |
| 9 | No real media path. | Social content is text-only despite media promises. | Picker/upload association absent. | Implement media pipeline with constraints and retry. | High |
| 10 | Search is local-only and misleading. | Users cannot find local entities. | Text input filters loaded Home rows. | Build scoped remote search. | High |
| 11 | Privacy controls are incomplete. | Users cannot manage visibility despite location sensitivity. | Schema field has no settings UI. | Add location/profile/activity visibility controls. | High |
| 12 | Location state is fragmented. | Manual exploration and current mode can feel inconsistent across screens. | Separate local settings, onboarding state, and runtime state. | Create one location context/store. | High |
| 13 | Radar map is decorative. | The core “radar” promise is not a real map experience. | Hardcoded roads/pins. | Integrate real map or clearly call it a preview. | High |
| 14 | Events/deals are schema-only. | Local category promises exceed available actions. | No current screen consumers. | Add real list/detail/create flows. | High |
| 15 | Auth errors are generic. | Users cannot recover intelligently. | One generic alert for all failures. | Map errors to validation, network, confirmation, and retry actions. | High |
| 16 | No physical Android validation. | Native permissions, storage, back behavior, and location may fail in reality. | No attached device/session evidence. | Run a documented device matrix. | High |
| 17 | No authenticated A/B security validation. | RLS claims remain mostly schema-level. | No confirmed test accounts. | Test cross-account read/write/delete attempts. | High |
| 18 | Public reads are broad. | Profiles, reactions, comments, and media metadata may expose more than intended. | Broad `using (true)` policies. | Review projections and policies against privacy requirements. | High |
| 19 | No moderation workflow. | Local alerts and reports cannot be safely governed. | Reports table only; no operational UI. | Add report actions and moderation process. | High |
| 20 | Product content density is unproven. | A local network with no real population feels empty. | No seed data and no verified production activity. | Securely seed/test or onboard a real pilot community. | Critical |

# 34. Top 20 opportunities

1. Build the first trustworthy local post-detail experience around approximate distance and useful context.
2. Make local alerts a differentiated, moderated South African safety utility.
3. Turn the follow graph into a local relevance signal rather than a vanity metric.
4. Create verified business profiles with opening hours, WhatsApp, offers, and local updates.
5. Make community membership and organiser tools simple enough for neighbourhood groups.
6. Add local events with expiry, reminders, venue context, and organiser identity.
7. Add deals with expiry and clear business attribution rather than generic advertising.
8. Build a useful local search across posts, businesses, events, communities, and areas.
9. Provide a high-quality “new city” exploration mode with temporary location and collections.
10. Use interests only after real content exists, then combine them with distance and freshness.
11. Add a transparent trust model for official/community-confirmed/reported alerts.
12. Create low-data media options for South African mobile conditions.
13. Add meaningful in-app notifications before push notifications.
14. Create saved local collections for places, alerts, events, and deals.
15. Add community-led local business discovery and recommendations.
16. Add multilingual readiness beginning with terminology and content structure rather than machine-translated UI.
17. Provide privacy-first controls that make area visibility understandable.
18. Build local contributor reputation around helpfulness and verified information.
19. Add business lead capture, WhatsApp contact, and promoted local discovery only after organic trust works.
20. Use a pilot in a small number of real South African areas to create density before expanding nationally.

# 35. Final assessment

Lekka is **not a prototype in the narrow sense**: it has real code, real navigation, a real auth client, a real profile schema, real location APIs, real PostGIS migrations, real RLS definitions, a real text-post insert path, local persistence, and an Android release build path.

It is also **not private-beta ready as a social network** because the core network interactions are missing, the visible Local and Social promises are mostly unconnected, no real content density is established, and the most important device/account security flows are not verified.

The most accurate single classification is:

> **B — Functional MVP foundation, with substantial social-product gaps before private beta.**

That distinction matters. The project is ready for disciplined next development, schema-backed feature implementation, and controlled validation. It is not ready to claim that users can use Lekka as a complete local social network today.

# References

[1]: file:///home/ubuntu/local-radar-sa/app/_layout.tsx "Root route and provider layout"
[2]: file:///home/ubuntu/local-radar-sa/app/onboarding.tsx "Onboarding screen"
[3]: file:///home/ubuntu/local-radar-sa/components/initial-route-gate.tsx "Initial route gate"
[4]: file:///home/ubuntu/local-radar-sa/app/auth.tsx "Authentication screen"
[5]: file:///home/ubuntu/local-radar-sa/lib/supabase.ts "Supabase client and auth helpers"
[6]: file:///home/ubuntu/local-radar-sa/app/(tabs)/index.tsx "Home feed screen"
[7]: file:///home/ubuntu/local-radar-sa/app/(tabs)/nearby.tsx "Local Radar screen"
[8]: file:///home/ubuntu/local-radar-sa/lib/supabase-repository.ts "Supabase repository layer"
[9]: file:///home/ubuntu/local-radar-sa/lib/local-radar.ts "Local cache, fixtures, settings, and ranking"
[10]: file:///home/ubuntu/local-radar-sa/lib/location.ts "Foreground location engine"
[11]: file:///home/ubuntu/local-radar-sa/app/(tabs)/create.tsx "Create screen"
[12]: file:///home/ubuntu/local-radar-sa/app/profile.tsx "Profile screen"
[13]: file:///home/ubuntu/local-radar-sa/app/(tabs)/social.tsx "Social screen"
[14]: file:///home/ubuntu/local-radar-sa/app/(tabs)/local.tsx "Local screen"
[15]: file:///home/ubuntu/local-radar-sa/lib/local-directory.ts "Business, community, and follow helpers"
[16]: file:///home/ubuntu/local-radar-sa/lib/theme-provider.tsx "Theme provider"
[17]: file:///home/ubuntu/local-radar-sa/supabase/migrations/202608200001_local_radar_core.sql "Core schema and RLS"
[18]: file:///home/ubuntu/local-radar-sa/supabase/migrations/202608200002_location_first_engine.sql "Location-first PostGIS RPCs"
[19]: file:///home/ubuntu/local-radar-sa/supabase/migrations/202608200003_local_entities.sql "Business members, events, deals, and RPCs"
[20]: file:///home/ubuntu/local-radar-sa/tests/migration.security.test.ts "Deterministic migration/security tests"
[21]: file:///home/ubuntu/local-radar-sa/supabase/connection-verification.md "Recorded Supabase connectivity verification"
[22]: file:///home/ubuntu/local-radar-sa/app.config.ts "Expo identity, permissions, and build configuration"
