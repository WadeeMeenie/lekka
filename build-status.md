# Lekka managed build status

Build details URL: https://expo.dev/accounts/wmeenies-team/projects/lekka/builds/b2b32d7a-bb90-4563-8a9d-57199ec284bb
Build ID: b2b32d7a-bb90-4563-8a9d-57199ec284bb
Source commit: a068ae43a2fed307e05b67d08711b23aa5119b3c
Profile: preview
Platform: Android internal distribution build
SDK: Expo 54.0.0 / project Expo SDK 54.0.29
Version: 1.0.0 (1)
Status at 2026-08-21 20:02:40 GMT+2: Build in progress; Gradle task :app:assembleRelease at 2m 33s.
Observed native stages: JavaScript bundle completed; remote Android credentials selected; CMake 3.22.1 installed; arm64-v8a native compilation active; no failure reported.
Pending: wait for build completion, download artifact, verify ZIP/APK, package, label, version, ABI, size, and SHA-256.

Latest observation: Expo still reports **Build in progress**. The active `Run gradlew` stage is approximately 8m 37s–8m 40s in, with tasks including native CMake compilation and release lint/package preparation. No failure or APK artifact link is visible yet. The build page remains https://expo.dev/accounts/wmeenies-team/projects/lekka/builds/b2b32d7a-bb90-4563-8a9d-57199ec284bb.

Source shown by Expo: commit `a068ae43a2fed307e05b67d08711b23aa5119b3c`.

## Fresh build submission

- Expo build URL: https://expo.dev/accounts/wmeenies-team/projects/lekka/builds/8e553ea6-0fdb-4bdf-b618-6834c093bc3b
- Expo build ID: 8e553ea6-0fdb-4bdf-b618-6834c093bc3b
- GitHub commit: b65173e2b378a5eec02792e2ca1b9835c8eeb65e
- Profile: preview
- Platform: Android
- Output: internal distribution APK
- Status: Build in progress; worker starting at submission
- Submitted: 2026-08-22

The resulting APK must be independently verified for package com.app.localradarsa, label Lekka, version 1.0.0, arm64-v8a, ZIP/APK integrity, and SHA-256.

## Fresh build failure

- Build ID: 8e553ea6-0fdb-4bdf-b618-6834c093bc3b
- Source commit: b65173e2b378a5eec02792e2ca1b9835c8eeb65e
- Failure stage: Prepare project
- Error: `Failed to clone git repository: https://x-access-token:*******@github.com/WadeeMeenie/lekka.git. remote: Repository not found. fatal: repository 'https://github.com/WadeeMeenie/lekka.git/' not found`
- Interpretation: Expo's stored GitHub build connection cannot currently clone the repository, despite the repository being reachable through the authenticated local GitHub remote.
- Action required: diagnose/reconnect Expo's GitHub integration or use an authenticated alternative build submission path; do not claim APK success.

## Latest managed build observation

- Expo build URL: https://expo.dev/accounts/wmeenies-team/projects/lekka/builds/845abb93-4e47-435b-9f12-4eea4075b378
- Build ID: 845abb93-4e47-435b-9f12-4eea4075b378
- Git commit: b65173e2b378a5eec02792e2ca1b9835c8eeb65e
- Profile: preview
- Target: Android internal distribution APK
- Observed status: Build in progress; `Run gradlew` approximately 8m30s, with signing validation complete and native/release packaging continuing.
- Observed warnings: Expo/React Native deprecation and manifest replacement warnings only; no failure reported.
