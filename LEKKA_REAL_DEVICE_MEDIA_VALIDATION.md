# Lekka Real Device Media and Offline Recovery Validation

**Release:** Lekka 1.0.0  
**Package:** `com.app.localradarsa`  
**Purpose:** Validate the current staged media-upload and account-scoped offline-recovery implementation on real Android hardware when available.

> **Physical-device status: BLOCKED.** The sandbox has neither `adb` nor an Android emulator binary available, and no physical Android device was exposed to this environment. No Samsung Galaxy S23 FE, physical photo picker, connectivity toggle, restart, or two-account runtime result is claimed.

## Supported validation results

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `pnpm check` completed successfully. |
| Lint | PASS | `pnpm lint` completed with 0 errors and 12 warnings. |
| Deterministic tests | PASS | 7 test files passed, 20 tests passed, and 1 pre-existing auth test remained skipped. |
| APK build | PASS | A fresh constrained arm64 release build succeeded after the first daemon attempt was memory-killed. |
| APK ZIP integrity | PASS | `unzip -tq` reported no compressed-data errors. |
| Package / label / version | PASS | `aapt` reported `com.app.localradarsa`, `Lekka`, and `1.0.0`. |

## Physical validation matrix

| Scenario | Result | Reason |
|---|---|---|
| Install and launch | BLOCKED | No physical Android device or usable ADB environment. |
| Normal photo post sequence | NOT TESTED | Requires authenticated native device session and photo selection. |
| Network interruption during photo upload | NOT TESTED | Requires a live native upload and controllable connectivity. |
| Airplane-mode text and photo drafts | NOT TESTED | Requires a physical device. |
| App kill and reopen | NOT TESTED | Requires a physical device. |
| Account A / B outbox isolation | NOT TESTED | Requires two confirmed authenticated sessions and hardware. |
| Retry failure recovery | NOT TESTED | Requires safe live server failure reproduction. |
| Photo permission denial/recovery | NOT TESTED | Requires Android runtime permission UI. |
| Large image and slow-network behavior | NOT TESTED | Requires a real gallery image and connectivity throttling. |
| Home pending / paused / retrying / failed / published state | NOT TESTED | Requires a queued device draft. |
| Location and Create privacy behavior | NOT TESTED | Requires Android location permission and movement. |

## APK evidence

| Property | Value |
|---|---|
| Filename | `app-release.apk` |
| Size | 37,748,551 bytes |
| SHA-256 | `f07e854d3138a5e7e56f11c93b4d1cb3779a2117fddaad0b97a9abe70ef6b464` |
| Package | `com.app.localradarsa` |
| App name | `Lekka` |
| Version | `1.0.0` |
| Artifact location | `/home/ubuntu/Downloads/app-release.apk` |

## Bugs

No P0, P1, or confirmed P2 defect was found by the supported static and deterministic checks. The first Gradle attempt ended because the sandbox daemon was killed under memory pressure; after stopping preview/watch processes and using constrained Gradle/Node memory, the retry succeeded. This is treated as an environment-capacity event, not as proof of a product failure.

The known lint warnings remain non-blocking and were not changed because this milestone is evidence-focused. No unrelated feature, dedicated outbox screen, byte-level progress implementation, database change, seed data, or APK binary was committed.

## Required follow-up

Install the attached APK on a physical Android device, preferably the target Samsung Galaxy S23 FE, then execute the normal-photo, interruption, airplane-mode, restart, A/B isolation, permission, large-image, slow-network, Home-sync, and location matrix before upgrading the release assessment beyond **INTERNAL TESTING**.
