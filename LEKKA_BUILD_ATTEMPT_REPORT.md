# Lekka Build Attempt Report

## GitHub

The current Lekka source was pushed successfully to `https://github.com/WadeeMeenie/lekka`.

| Field | Value |
|---|---|
| Commit | `4f1243f9d1e9f50b1ecc777df8231ff6c1f730a4` |
| Push status | **SUCCESS** |
| Changed content | Release documentation and task tracking only; application source is unchanged from the previously verified build source |

## Fresh Build Attempts

A managed Android preview build was submitted from the authenticated Expo workflow:

| Field | Value |
|---|---|
| Build ID | `8d41814c-ab08-4ed5-b6d2-c621f782d329` |
| Commit | `4f1243f9d1e9f50b1ecc777df8231ff6c1f730a4` |
| Result | **FAILED** during Resolve build configuration |
| Actual error | `Google Service Account Keys cannot be set up in --non-interactive mode.` |

The local Gradle fallback was also attempted with one worker and arm64-only compilation. Both attempts were terminated when the Gradle daemon disappeared during native CMake compilation, consistent with the sandbox’s memory pressure. No new APK was produced by either attempt.

## Downloadable APK Available

The attached `lekka-internal-test.apk` is the previously completed and independently verified managed internal-test APK. It is functionally equivalent to the pushed commit because the pushed commit contains documentation/task-tracking changes only, but it is **not a newly generated artifact for commit `4f1243f`**.

| Field | Value |
|---|---|
| Filename | `lekka-internal-test.apk` |
| Size | 51,005,983 bytes |
| SHA-256 | `566a898933afc1841d4070e382e4f23ee697e35a32c819cbcb8514bf8a83c07b` |
| Package | `com.app.localradarsa` |
| App name | `Lekka` |
| Version | `1.0.0` |
| ABI | `arm64-v8a` and `armeabi-v7a` |
| Integrity | ZIP/APK integrity passed |

This APK is for internal testing only and is not represented as production-signed or Google Play-ready. A fresh build from commit `4f1243f` remains blocked until the Expo credential configuration permits the managed build to resolve, or a higher-memory local Android build environment is available.
