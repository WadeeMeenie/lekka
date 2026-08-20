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
- [ ] Save the final project checkpoint

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
- [ ] Validate backend milestone and save a new checkpoint

## Lekka branding and APK milestone

- [x] Replace all user-facing Local Radar SA app-name references with Lekka
- [x] Verify package/application ID and Android build configuration remain unchanged unless required
- [x] Validate the existing app tests and offline-safe paths after branding
- [x] Prepare the final Lekka checkpoint for managed APK generation

## APK delivery blocker

- [ ] Execute the supported managed Android build workflow for Lekka
- [ ] Capture and diagnose any real build failure, then retry if project-level
- [ ] Verify APK existence, size, package ID, app name, version, and installability
- [ ] Deliver the actual APK artifact if the managed workflow produces one

## Local Android build investigation

- [x] Inspect Expo workflow, prebuild support, Android SDK/NDK, Java, Gradle, and native project state
- [x] Generate the native Android project only if the environment supports a safe prebuild
- [x] Attempt a release APK build with the generated Gradle project
- [x] Diagnose and retry any project-level Gradle failure
- [x] Verify APK metadata, size, package ID, app name, version, and installability
- [x] Deliver the APK artifact or document the exact external environment blocker
