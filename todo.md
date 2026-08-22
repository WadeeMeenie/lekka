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

## Internal beta real-world validation

- [x] Read the complete internal-beta validation brief and inventory available device/account/session resources
- [x] Attempt supported physical-device, two-account, storage, offline, location, media, notification, moderation, and private-community checks without fabricating results; unavailable device/accounts are explicitly BLOCKED/NOT TESTED
- [x] Run automated and static validation and fix only the confirmed onboarding lint defect; remaining lint items are warnings
- [x] Record exact blockers and explicit NOT TESTED results for unavailable runtime prerequisites
- [x] Write and save the internal-beta validation record and checkpoint

## Offline and media-upload UX improvement

- [x] Add animated upload progress and stage feedback to the Create flow
- [x] Add clearer offline draft and retry states with account-safe messaging
- [x] Add actionable error handling for post, upload, association, and sync failures
- [x] Add deterministic tests for error classification and retry state transitions
- [x] Run TypeScript, lint, and tests; mobile-sized screenshot capture was attempted but unavailable because no preview URL was exposed

## Real device media and offline recovery validation

- [x] Check for an attached Android device and confirmed test-account availability; hardware tooling and a device were unavailable
- [x] Run real-device media upload, offline, restart, account-isolation, permission, location, and Home sync scenarios if prerequisites exist; blocked and recorded as NOT TESTED
- [x] Run static regression checks and fix only verified P0-P2 defects; no product defect found
- [x] Build and verify a fresh release APK with hash and metadata
- [x] Commit and push any source changes to GitHub without APKs or secrets
- [x] Record exact PASS, FAIL, BLOCKED, and NOT TESTED evidence

## In-app beta feedback

- [x] Add a secure Supabase feedback table and authenticated insert policy
- [x] Add a validated feedback submission repository and deterministic tests
- [x] Add a beta feedback form for bug reports and feature requests
- [x] Add a profile entry point for beta feedback
- [x] Run migration, TypeScript, lint, tests, visual verification, and push the feedback feature to GitHub; visual route verification remains blocked by first-launch onboarding state

## Smart accounts, business onboarding, and provider authentication

- [x] Audit existing Supabase auth, onboarding, profile, business, and privacy data boundaries
- [x] Add a privacy-safe personal identity and business-ownership data model with Supabase RLS
- [x] Add progressive personal and business account-intent onboarding
- [x] Add Google and Microsoft Supabase OAuth architecture with clear configuration-required states
- [x] Add personal profile completion for name, date of birth, and optional gender
- [x] Add dedicated business profile setup with owner-controlled editing and location/service-area fields
- [x] Add foundation for one user identity with personal and business profile switching
- [x] Add deterministic tests for validation, account intent, OAuth configuration, privacy, business ownership, and invitations
- [x] Run database verification, TypeScript, lint, tests, Android bundle export, and truthful route validation

## Managed Android release retry

- [ ] Commit the verified smart-account release candidate and push it to GitHub before managed building
- [ ] Inspect permitted workspace locations for an existing production/upload Lekka Android signing keystore without exposing secrets; exclude debug credentials
- [ ] Reuse an existing production signing credential only; do not generate, rotate, or substitute a debug keystore
- [ ] Submit the unchanged commit to a larger managed Android build environment
- [ ] Verify a fresh arm64-v8a APK for ZIP integrity, package, label, version, ABI, size, and SHA-256
- [ ] Attach the verified fresh APK as a downloadable artifact

## Current-source local release APK

- [ ] Confirm commit `c52e0c0c38cd62978e31ed74c70808fbdfcec87b` is the unchanged local Android build source
- [ ] Build the current source through the proven constrained local arm64-v8a Gradle release path without signing changes
- [ ] Verify the fresh APK’s ZIP integrity, metadata, ABI, size, and SHA-256
- [ ] Attach the verified fresh APK as a downloadable artifact

## Authorized debug-signed internal-test APK

- [ ] Build commit `c52e0c0c38cd62978e31ed74c70808fbdfcec87b` as a debug-signed internal-test APK using the existing local release configuration
- [ ] Verify and attach the debug-signed internal-test APK without representing it as production-signed or Play Store ready

## Dedicated internal-debug Android variant

- [x] Audit the current Gradle build types and safe managed-build availability for an internal-test variant
- [x] Add a dedicated debug-signed `internalDebug` variant while leaving production release signing unresolved
- [x] Validate the Gradle configuration without embedding or committing any keystore or credential
- [x] Commit and push the internal-debug configuration change to GitHub
- [x] Build and verify a current-commit internal-test APK only in a larger managed environment, or record the exact environment limitation
- [x] Build, verify, and attach a fresh arm64-v8a Android release APK
- [ ] Commit and push all source changes to GitHub
- [x] Add minimal EAS preview APK build profile required by the managed GitHub builder
- [x] Submit and verify the managed internal-test APK after the EAS project-linkage fix

— 2026-08-21 build workflow blocker: Expo GitHub build form rejected the current source because /eas.json is absent.
- [x] Align Expo slug with the existing EAS project slug `lekka` so managed builds can resolve project credentials

## Android authentication and onboarding bugfix

- [x] Fix email sign-in remaining in `Please wait...` after valid credentials
- [x] Fix onboarding `Let's go` navigation so it reaches the real authenticated experience or a clear guest destination
- [x] Replace placeholder Google and Microsoft letter badges with proper provider icons
- [x] Add deterministic regression coverage for auth completion and onboarding navigation
- [ ] Build and verify an updated internal-test APK

## Email sign-in feedback

- [x] Add a loading spinner to the email sign-in button while authentication is in progress
- [x] Validate spinner visibility, disabled state, and existing auth regression behavior
- [x] Save and deliver the updated project checkpoint


## Authentication timeout feedback

- [x] Add a clear connection-status error message when authentication requests time out
- [x] Validate timeout messaging and existing auth recovery behavior
- [x] Save and deliver the updated project checkpoint


## Fresh APK release after timeout feedback

- [ ] Commit and push the current authentication timeout-feedback changes
- [ ] Build a fresh managed Android internal-test APK from the pushed HEAD
- [ ] Verify APK integrity, package, label, version, ABI, and SHA-256
- [ ] Attach the fresh APK and release report


## Attached Lekka master brief execution

- [x] Audit current repository, Supabase configuration/schema, routes, repositories, tests, and release configuration
- [x] Produce the evidence-based Lekka production gap analysis
- [ ] Implement confirmed high-priority gaps without inventing unverified functionality
- [ ] Run automated, database, and available runtime validation
- [ ] Commit and push validated source changes without credentials or APKs
- [ ] Build and verify a fresh internal-test APK from final HEAD
- [ ] Deliver the gap analysis, release status, and downloadable APK


- [x] Push the current Lekka source changes to GitHub
- [ ] Submit a fresh managed Android internal-test APK build
- [ ] Download and verify the fresh APK artifact
- [ ] Deliver the downloadable APK and release report

## User profile screen

- [x] Add a profile screen with avatar, display name, and account summary
- [x] Add basic locally persisted profile settings
- [x] Add profile navigation entry and accessible interaction states
- [x] Add deterministic tests for profile settings persistence and validation

## Profile follow-up and authentication fixes

- [x] Add deterministic tests for profile settings persistence and validation
- [x] Add avatar photo selection/upload using the existing profile image field where supported
- [x] Add dedicated notification and privacy settings controls
- [x] Diagnose the screenshot-reported Google, Microsoft, and email authentication failures
- [x] Fix project-controlled authentication error and timeout handling without exposing credentials
- [x] Run regression validation and document provider-configuration blockers that require Supabase setup

## Profile editing enhancement

- [x] Add clear display-name editing affordance and validation
- [x] Add short-bio editing affordance with character guidance and validation
- [x] Add deterministic tests for profile field validation

## Username availability validation

- [x] Add authenticated username availability query with current-user exclusion
- [x] Add inline checking, available, unavailable, and unverifiable states to the profile editor
- [x] Prevent profile save when the username is unavailable or cannot be verified
- [x] Add deterministic tests for username normalization and availability decisions

## Username improvement follow-up

- [x] Verify and enforce a database-level unique username constraint
- [x] Add debounced username availability checks
- [x] Add alternative username suggestions for unavailable handles
- [x] Add deterministic tests for suggestions and debounce-related decisions

## Username safeguards follow-up

- [x] Add reserved-word validation for public usernames
- [x] Add accessibility announcements for username availability changes
- [x] Add username-change history and a safe cooldown rule
- [x] Add deterministic tests for reserved words and cooldown behavior

## Server-enforced username safeguards

- [x] Add server-backed username change history and cooldown enforcement
- [x] Add a confirmation step before applying a username change
- [x] Add privacy-conscious analytics for availability failures and suggestion selection
- [x] Add deterministic tests for server cooldown decisions and confirmation behavior

## Account settings page

- [x] Add an authenticated account settings route
- [x] Show current username and cooldown status
- [x] Show username change history from Supabase with loading and error states
- [x] Add profile navigation to account settings
- [x] Add deterministic tests for settings status and history presentation

## Attached audit and release follow-up

- [x] Audit repository capabilities against the attached requirements
- [x] Complete the recommended account-settings follow-up work that is safe and in scope
- [x] Run full validation and document verified versus unverified capabilities
- [x] Push the current source to GitHub
- [ ] Attempt a fresh Android APK build and verify any resulting artifact
- [x] Deliver the audit and release outcome honestly

## P0/P1 execution from audit

- [x] Read current audit artifacts and inspect current HEAD
- [x] Write IMPLEMENTATION_DECISION.md with P0/P1/P2 sequencing
- [x] Implement only the approved highest-value reliability/security improvements
- [x] Run full validation and security checks
- [ ] Commit and push approved source changes (local commit complete; GitHub push blocked by managed S3 remote credentials)
- [ ] Attempt and verify a fresh Android APK build
- [x] Deliver implementation and release outcome without false claims

## Execute all recommendations

- [ ] Push the current implementation commit through the managed GitHub workflow
- [ ] Retry and monitor the Android internal-test build
- [ ] Run available two-account authorization and physical-device validation
- [ ] Verify artifacts and deliver the complete execution status
- [ ] Rebuild and attach a fresh downloadable Lekka internal-test APK from the current source commit
- [ ] Fix release APK Supabase authentication configuration so email sign-in is not reported as backend-unconfigured
- [ ] Verify Google and Microsoft provider configuration messaging in the current build
- [ ] Build and attach a fresh current-commit internal-test APK after the release configuration fix
- [ ] Retrieve and attach the direct APK binary from Expo build 2dbd9faa instead of only providing the build page URL
- [x] Add password visibility toggle to the Lekka email sign-up/sign-in password field
- [x] Improve sign-up confirmation messaging for email authorization and handle 502/bad-gateway failures safely
- [ ] Customize the Supabase confirmation-email wording for Lekka where the configured project integration permits it
- [x] Add deterministic tests for password visibility state and sign-up error messaging
- [ ] Push auth UX fixes and prepare a fresh APK build
- [ ] Configure and verify Lekka-branded Supabase confirmation-email content
- [ ] Validate the latest auth UX changes and checkpoint the source
- [ ] Build, verify, and attach a fresh APK from the latest pushed commit

- [x] Diagnose the reported sign-up failure on the current Android APK, including timeout and provider-setup behavior
- [x] Verify the current Supabase Auth configuration and release-build environment variables without exposing secrets
- [x] Fix the sign-up flow or backend configuration issue with the smallest safe change
- [x] Add or update deterministic tests covering the sign-up failure path and user-safe messaging
- [x] Re-run TypeScript, tests, and lint; document any remaining provider configuration requirement

- [x] Build a fresh Android APK from the current sign-up retry fix checkpoint
- [x] Verify the fresh APK package, app name, version, ABI, integrity, and SHA-256
- [x] Attach the fresh APK for device testing

- [x] Diagnose Google and Microsoft login failures and identify required Supabase provider configuration
- [x] Replace date-of-birth free-form input with separate year, month, and day selectors
- [x] Diagnose and fix the onboarding profile-save RLS error shown in the latest device screenshot
- [x] Add deterministic tests for date selection/validation and onboarding save behavior
- [x] Run TypeScript, tests, lint, and mobile-oriented validation for the changes

- [ ] Audit the current email-confirmation and provider-confirmation behavior
- [ ] Clarify in sign-up UX that users create their own Lekka email/password credentials
- [ ] Add visible password conditions and client-side validation for account creation
- [ ] Remove or bypass only the app-side confirmation block where Supabase permits it
- [ ] Document any Supabase dashboard confirmation setting that cannot be changed safely in app code
- [ ] Run TypeScript, deterministic tests, and lint for the authentication update

- [x] Remove Google sign-in controls from the Lekka authentication screen
- [x] Remove Microsoft sign-in controls from the Lekka authentication screen
- [x] Add strong visible password requirements for email account creation
- [x] Validate password rules before submitting sign-up and preserve password visibility toggle
- [x] Add deterministic password-rule tests and run TypeScript, tests, and lint

- [x] Add a real-time visual password-strength meter to the email sign-up form
- [x] Add deterministic password-strength scoring tests and validate the UI integration

- [x] Audit and improve the forgot-password flow from the Lekka login screen
- [x] Add clear reset-email validation, loading feedback, and safe recovery messaging
- [x] Add deterministic password-reset tests and run TypeScript, tests, and lint

- [x] Audit the installed APK scheme and password-reset callback handling
- [x] Configure the Supabase password-reset redirect allowlist for Lekka
- [x] Pass the APK redirect URI in the reset-email request and handle recovery links in-app
- [x] Validate reset-link configuration and document any dashboard-only action

- [x] Add a resend-reset-email button to the forgot-password screen
- [x] Add resend cooldown protection and accessible success/error feedback
- [x] Add deterministic resend-flow tests and run TypeScript, tests, and lint

- [ ] Update Supabase Auth email template branding to match Lekka’s visual design
- [ ] Verify the updated template configuration and document any provider limitations

- [x] Verify `manuslocalradarsa://reset-password` native scheme, Android intent filter, Supabase redirect, and reset route

- [x] Add clear invalid/expired reset-link messaging and a Request New Link button
- [x] Add deterministic tests and validate the reset-link recovery state

- [x] Automatically redirect to login with a password-reset success message after reset completion
- [x] Add deterministic coverage and validate the post-reset redirect flow

- [x] Ensure the reset-password screen has clear real-time password strength feedback and requirements guidance
- [x] Add deterministic coverage and validate reset-screen password strength behavior

- [x] Make reset-password strength indicator and checklist scroll above the mobile keyboard
- [x] Validate keyboard-aware reset-password scrolling behavior

- [x] Show a green checkmark beside each met reset-password requirement
- [x] Validate the updated checklist indicator behavior

- [x] Disable reset-password submit until all password requirements are met and explain why
- [x] Validate disabled-submit behavior and tooltip guidance

- [x] Add a subtle shake animation when disabled reset submission is attempted
- [x] Validate the disabled-submit shake interaction

- [x] Confirm before leaving reset-password when password text is unsaved
- [x] Validate clean and unsaved exit navigation behavior

- [x] Add independent Show/Hide Password toggle icons inside both reset-password fields
- [x] Validate the reset-password visibility controls

- [x] Auto-hide visible reset passwords after five seconds of inactivity
- [x] Animate show/hide icon transitions
- [x] Add subtle haptic feedback for visibility toggles and newly met password requirements
- [x] Validate the password interaction polish

- [x] Clear reset-password and confirmation fields when the screen is revisited
- [x] Validate revisited reset-screen field-clearing behavior

- [x] Add Generate Secure Password action that fills both reset-password fields
- [x] Validate generated-password strength and autofill behavior

- [x] Add Copy to Clipboard for the generated password
- [x] Show confirmation toast feedback after generation and copying
- [x] Add generator settings for password length and character types
- [x] Validate clipboard, toast, and configurable generator behavior

- [x] Commit and push the current Lekka source to GitHub
- [x] Build an APK from the pushed commit
- [x] Verify and attach the actual APK artifact

- [x] Fix avatar upload overwrite and persist the new profile-image path
- [x] Render the saved avatar in the home header and refresh it after profile changes
- [x] Add deterministic avatar persistence coverage and validate the full flow

- [x] Show a bottom success toast after a profile picture uploads successfully
- [x] Validate profile-picture toast visibility and upload feedback behavior

- [x] Audit Home, Radar, Social, and Local tabs for fake data and dead-end actions
- [x] Wire confirmed tab content to real Supabase data or truthful empty states
- [x] Validate tab navigation, loading, and data states with deterministic tests

- [x] Add community and directory detail destinations from the Social and Local tabs
- [x] Wire authenticated follow, messaging, and listing actions where supported
- [x] Validate the expanded tab flows and document device/account test limits

- [x] Persist community join/leave membership and show live member counts
- [x] Validate authenticated community membership behavior and count updates

- [x] Add a live member list to community details
- [x] Add owner/moderator controls for member management and community settings
- [x] Add Realtime member-count synchronization with safe policy handling
- [x] Validate community management flows and document unavailable multi-account tests; TypeScript and focused community tests pass, while three pre-existing suites still hit the Rollup parser error

- [x] Add moderator-level permissions for community post and content moderation
- [x] Add dedicated owner community settings for description, rules, visibility, and branding metadata
- [x] Add deterministic tests for moderator authorization and settings validation
- [x] Validate the new management flows and save a checkpoint
