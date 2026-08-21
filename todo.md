# Project TODO

- [x] Initialize the Expo Android project for Local Radar SA
- [x] Write the mobile interface design plan
- [x] Establish the MVP scope and domain model for local posts, alerts, radar items, communities, and settings
- [x] Implement the five-destination bottom navigation
- [x] Implement the Home local feed with For You, Nearby, Trending, and Following states
- [x] Implement Local Radar list view with radius and category filters
- [x] Implement Local Radar map-ready state with privacy-safe area markers
- [x] Implement Create flows for posts and local alerts
- [x] Implement local feed and settings persistence with AsyncStorage
- [x] Implement Social communities/following/messages entry points
- [x] Implement Local directory categories for businesses, deals, events, marketplace, jobs, and services
- [ ] Implement post and radar item detail screens
- [ ] Implement profile, search, notifications, and privacy settings screens
- [x] Add accessibility labels, pressed states, loading states, empty states, and error states
- [x] Create and install the custom Local Radar SA app icon assets
- [x] Update app.config.ts branding fields without changing appSlug
- [x] Add deterministic unit tests for ranking, persistence, and create flows
- [x] Run type-checking and test suite; lint remains a follow-up check
- [ ] Validate the app preview at desktop and mobile-sized viewports
- [x] Prepare the Android APK build path and document limitations
- [x] Save the final project checkpoint

## Production backend milestone

- [x] Configure Supabase-compatible client access without exposing service-role credentials
- [x] Add production database migration for profiles, interests, follows, communities, posts, media, comments, reactions, saves, businesses, events, deals, alerts, listings, reports, and notifications
- [x] Add Row Level Security policies and security-policy tests
- [x] Add email/password authentication, session restoration, logout, and password-reset architecture
- [x] Replace feed and Local Radar seed reads with backend-first queries plus cached fallback
- [x] Add real profile, business, follow, community, post, alert, and listing data operations
- [x] Add Android location permission handling with manual-area fallback and privacy-safe location model
- [x] Add Supabase Storage media-upload and thumbnail architecture without fake production video claims
- [x] Add realtime subscription boundaries for feed, alerts, comments, and notifications
- [x] Add retryable loading/success/error states for backend operations
- [x] Validate backend milestone and save a new checkpoint

## Lekka branding and APK milestone

- [x] Replace all user-facing Local Radar SA app-name references with Lekka
- [x] Verify package/application ID and Android build configuration remain unchanged unless required
- [x] Validate the existing app tests and offline-safe paths after branding
- [x] Prepare the final Lekka checkpoint for managed APK generation

## APK delivery blocker

- [x] Execute the supported managed Android build workflow for Lekka via local Expo prebuild + Gradle release build
- [x] Capture and diagnose any real build failure, then retry if project-level
- [x] Verify APK existence, size, package ID, app name, version, and installability; no Android device was attached for install test
- [x] Deliver the actual APK artifact if the managed workflow produces one

## Local Android build investigation

- [x] Inspect Expo workflow, prebuild support, Android SDK/NDK, Java, Gradle, and native project state
- [x] Generate the native Android project only if the environment supports a safe prebuild
- [x] Attempt a release APK build with the generated Gradle project
- [x] Diagnose and retry any project-level Gradle failure
- [x] Verify APK metadata, size, package ID, app name, version, and installability
- [x] Deliver the APK artifact or document the exact external environment blocker

## Supabase connection verification

- [x] Inspect configured Supabase URL, publishable-key state, and connector availability without exposing secrets
- [x] Verify the remote Supabase Auth endpoint with the publishable key
- [x] Verify database REST/schema access and distinguish missing schema from invalid credentials; remote public schema currently has 0 tables and 0 migrations
- [x] Report the connection status and save a checkpoint if project state changes

## Lekka production foundation and real current-location engine

- [x] Read the remainder of the attached specification and inspect the existing migration completely
- [x] Compare the existing migration against the empty remote Supabase schema
- [x] Apply the migration to remote project local-radar-sa and troubleshoot any exact failure
- [x] Verify PostGIS, geography columns, spatial indexes, nearby RPCs, and RLS policies remotely
- [x] Make current Android device location the primary discovery input with efficient foreground refresh thresholds
- [x] Add manual exploration as a temporary override with a return-to-my-location action
- [x] Connect nearby posts, businesses, alerts, events, deals, and feed ranking to backend current-location queries
- [ ] Run authenticated CRUD and cross-account security validation (blocked: no test accounts/device session available)
- [x] Save and deliver the production foundation checkpoint

## Security validation, real location, and development seed milestone

- [x] Inspect remote RLS/storage findings, test-account availability, and attached-device availability
- [x] Run bounded remote RLS, storage, PostGIS, RPC, privacy, and performance checks
- [ ] Run controlled A/B CRUD authorization checks if test accounts can be created safely (NOT TESTED: Auth requires confirmed email and no device/session was available)
- [ ] Create clearly labelled multi-city development seed data only after security validation and secure ownership prerequisites (NOT CREATED: no authenticated seed owner was available)
- [x] Validate offline/cache/reconnect behavior with deterministic project tests
- [x] Build and verify the latest Lekka release APK
- [x] Save a strict evidence-based validation checkpoint and report all untestable device/account cases as NOT TESTED

## Final pre-seed validation setup

- [ ] Determine whether two controlled Supabase Auth test accounts can be created without exposing credentials (NOT AVAILABLE: email confirmation is required and no confirmed test inboxes were supplied)
- [x] If account creation is unavailable, document exact minimal Supabase Auth setup steps and temporary credential handling
- [x] Perform read-only spatial_ref_sys column, exposure, write-capability, and PostGIS-functionality analysis
- [x] Produce the exact A/B authorization, storage, Android location, permission, manual override, and offline/reconnect procedures
- [x] Confirm no development seed data is created before validation prerequisites are met
- [x] Save the validation-preparation checkpoint and deliver the handoff report

## Approved spatial_ref_sys remediation

- [ ] Apply least-privilege restrictions to public.spatial_ref_sys without changing application tables or PostGIS internals (FAILED: Supabase migration role is not owner; direct ACL remained unchanged)
- [x] Verify anonymous and ordinary-authenticated write access is blocked with exact responses; anonymous write blocking NOT achieved, authenticated HTTP test unavailable
- [x] Verify PostGIS, spatial indexes, nearby RPCs, radius queries, business/post proximity, Local Radar, and application RLS remain working
- [x] Document exact remediation and preserve no-seed status
- [x] Save the remediation checkpoint

## Real application validation handoff

- [x] Stop further spatial_ref_sys migration attempts and document it as extension-owned by supabase_admin
- [x] Provide exact temporary confirmed Supabase Auth account setup steps
- [x] Provide exact A/B authorization, storage, physical location, permission fallback, manual override, and offline/reconnect procedures
- [x] Preserve no-seed and no-rebuild status unless a code fix is required
- [x] Save the application-validation handoff checkpoint

## APK artifact delivery

- [x] Locate and verify the existing Lekka release APK before rebuilding
- [x] Rebuild only if the existing APK is absent or invalid; existing APK was valid, so no rebuild was needed
- [x] Copy the verified APK into the project output/artifact area
- [x] Attach the actual APK artifact with verified package, app label, version, and size

## Loading UX improvement

- [x] Add branded skeleton loading animation for the Home feed’s initial fetch
- [x] Add branded skeleton loading animation for Nearby discovery’s initial fetch
- [x] Preserve cached content and keep interactions responsive during background refreshes
- [x] Add deterministic tests for loading-state transitions and refresh behavior
- [x] Run type-checks, tests, and visual verification for the loading states

## Lekka UX and onboarding overhaul

- [x] Add first-launch welcome and location-introduction onboarding flow
- [x] Add guest browsing mode with explicit signed-in state
- [x] Add polished reusable authentication gates for post, comment, react, save, message, and community actions; follow remains pending because no follow control exists yet
- [x] Add progressive onboarding interest-selection and profile personalization flow
- [x] Add persistent Lekka theme personalization with live previews
- [x] Connect onboarding completion, location preference, interests, and theme to the local experience
- [x] Replace unauthenticated offline social-action messaging with a join/sign-in prompt
- [x] Add deterministic tests for onboarding preferences and personalization helpers
- [x] Run type-checks, tests, and visual verification for the overhaul

## Product reality audit

- [x] Complete source-grounded Lekka product and architecture audit from the attached brief
- [x] Document actual flows, backend connections, offline behavior, security boundaries, placeholders, incomplete features, and device-verification gaps
- [x] Deliver audit report without modifying code, creating seed data, or building an APK

## Social Core V1

- [x] Implement real post detail with privacy-safe location and protected actions
- [x] Implement persistent comments with pagination and ownership enforcement
- [x] Implement persistent like/unlike reactions with real counts
- [x] Implement saved posts and a saved-content surface
- [x] Implement public profile navigation and follow/unfollow
- [x] Implement in-app notifications for follows, comments, and reactions
- [x] Connect authenticated photo posting and storage association
- [x] Implement account-scoped authenticated offline drafts with retry/sync semantics
- [x] Harden the implemented social surfaces with paginated queries, useful empty states, user-facing errors, and privacy-safe location; feed-wide pagination and moderation remain follow-up work
- [x] Run TypeScript, deterministic tests, migration application, and security-advisor validation; record unavailable device/multi-user tests honestly
- [x] Commit and push Social Core V1 changes to GitHub; initial source commit is pushed, with the follow-up security-lockdown migration pending push

## Social Core V1 production validation and feed hardening

- [x] Complete the validation brief and inventory available two-account, device, storage, and database evidence; two-account and physical-device evidence remain unavailable
- [x] Implement stable cursor pagination for the location-first Home feed
- [x] Implement paginated public-profile post lists
- [x] Harden photo upload failure recovery, retry, draft preservation, and duplicate prevention; orphan cleanup remains limited by available storage API
- [x] Add deterministic tests for cursors, pagination boundaries, and duplicate-safe page merging; device/media retry remains not device-tested
- [x] Run available database/security/session validation and record unavailable device and two-account tests honestly
- [x] Commit and push the validation and hardening changes to GitHub

## Final real-world validation and APK delivery

- [x] Audit current HEAD, working tree, Supabase/Expo/Android configuration, and existing APK artifacts
- [x] Attempt available two-account, storage, offline, device, location, moderation, and notification validation without fabricating evidence; unavailable sessions/devices are explicitly marked NOT TESTED
- [x] Run TypeScript, deterministic, pagination, auth-related, and security tests
- [x] Build a fresh release APK from the current source
- [x] Verify APK existence, ZIP/APK structure, package, label, version, size, and SHA-256
- [x] Preserve the actual APK as a downloadable artifact
- [x] Commit and push all source and validation-report changes to GitHub

## Release-candidate audit and consistency check

- [x] Audit GitHub HEAD, working tree, branch, release configuration, migrations, RLS, and storage policy consistency
- [x] Re-verify APK file, manifest, ABI, native libraries, permissions, and expected SHA-256
- [x] Run secret and GitHub release-hygiene checks without printing sensitive values
- [x] Audit location privacy, offline account isolation, Social Core, feed, media, UX, South African relevance, and performance risks
- [x] Reproduce the release build and document byte-for-byte reproducibility honestly
- [x] Produce conservative scores, release status, blockers, and next actions without changing code or database
