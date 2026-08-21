# Lekka Final Real-World Validation and APK Delivery

## Build status

**SUCCESS.** The current native Android release pipeline completed with `assembleRelease` using the constrained arm64 configuration. The APK is a valid ZIP/APK and was copied to `/home/ubuntu/Downloads/app-release.apk` for download.

## GitHub

| Field | Result |
|---|---|
| Repository | https://github.com/WadeeMeenie/lekka |
| Pre-release HEAD | `fc83760b6b51f8f55cecb77ca5736a9cdf2b77d4` |
| Push status | Pending final release-record commit |

## APK

| Field | Exact value |
|---|---|
| Filename | `app-release.apk` |
| Download location | `/home/ubuntu/Downloads/app-release.apk` |
| Size | 37,740,643 bytes |
| SHA-256 | `4f6f874f15fe0ebcd16d20332664a0121c709afdb73a2a9659a4326ac6155b1a` |
| Package | `com.app.localradarsa` |
| App name | `Lekka` |
| Version | `1.0.0` |
| Structural verification | `unzip -tq` passed; Android `aapt dump badging` passed |
| Physical install | NOT TESTED — no Android device attached; `adb devices` returned no device |

## Automated tests

| Check | Result |
|---|---|
| TypeScript | PASS — `pnpm check` |
| Deterministic suite | PASS — 6 files, 17 tests; 1 pre-existing auth test skipped |
| Pagination | PASS — 3 cursor/deduplication tests |
| Security/migration tests | PASS — existing deterministic migration/security suite |
| Secret scan | PASS for service-role/private-key patterns; only the standard local Android debug keystore exists and was not committed |

## Real-world validation

Two-account validation is **BLOCKED — NO CONFIRMED TEST ACCOUNTS**. No temporary Auth accounts were fabricated. Therefore A/B RLS attacks, storage isolation, notification actor/recipient flows, account-specific read state, and offline account isolation are **NOT TESTED**.

Physical-device testing is **NOT TESTED**. No Android device was attached. Location movement, manual exploration, return-to-current, photo picker behavior, media interruption, offline kill/reopen, notification persistence, and actual installation remain unverified.

Moderation, notification badges, cursor pagination, profile pagination, media-aware drafts, and retry controls are source-implemented and covered where deterministic tests exist, but their full end-to-end behavior remains **NOT TESTED** without authenticated users and a device.

## Known limitations and next required actions

The release is not declared production-ready solely from automated checks. The next required action is to run the supplied A/B and Android-device validation matrix with two confirmed temporary Supabase accounts, one Android device, and controlled network interruption. Results must be recorded as PASS or FAIL from actual observations.
