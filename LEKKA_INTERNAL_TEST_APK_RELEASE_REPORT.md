# Lekka Internal-Test APK Release Report

## Build

| Field | Value |
|---|---|
| Build status | **SUCCESS** |
| Managed build ID | `845abb93-4e47-435b-9f12-4eea4075b378` |
| GitHub commit | `b65173e2b378a5eec02792e2ca1b9835c8eeb65e` |
| EAS profile | `preview` |
| Signing | Internal-test credential; not production signing |

## APK Artifact

| Field | Value |
|---|---|
| Filename | `lekka-internal-test.apk` |
| Project artifact path | `artifacts/lekka-internal-test-845abb93.apk` |
| Download-folder path | `/home/ubuntu/Downloads/lekka-internal-test.apk` |
| Size | 51,005,983 bytes (approximately 48.6 MiB) |
| SHA-256 | `566a898933afc1841d4070e382e4f23ee697e35a32c819cbcb8514bf8a83c07b` |
| Package | `com.app.localradarsa` |
| App name | `Lekka` |
| Version | `1.0.0` |
| Native ABI | `arm64-v8a` present; `armeabi-v7a` also present |

## Verification

The APK was downloaded from the completed Expo/EAS build artifact URL. ZIP/APK integrity passed with `unzip -tq`. The embedded Expo app configuration reports the expected name, slug, version, bundle identifier, and Android package. The archive contains native libraries for `arm64-v8a`, which is the relevant ABI for the Samsung Galaxy S23 FE.

This is an **internal-test APK**. It is not represented as production-signed or Google Play-ready. Physical installation on a Samsung Galaxy S23 FE was not executable in the sandbox; the APK is available as the attached artifact for device installation testing.
