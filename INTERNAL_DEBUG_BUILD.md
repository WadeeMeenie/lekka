# Lekka Internal Test Build

## Purpose

The Android `internalDebug` build type produces a **debug-signed internal-test APK** for device testing only. It preserves the full application feature set and bundles the JavaScript application for standalone installation.

## Explicit signing separation

| Build type | Intended use | Signing status |
|---|---|---|
| `internalDebug` | Internal device testing | Uses the existing local debug signing configuration. It is not production-signed or Play Store ready. |
| `release` | Future production distribution | Deliberately has no configured signing credential until a genuine production/upload keystore is supplied. |

The internal test variant has the launcher label **Lekka Internal Test** and version suffix `-internal`. No keystore, password, private credential, or service-role key is added to source control.

## Build command

```bash
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleInternalDebug --no-daemon --max-workers=1 -PreactNativeArchitectures=arm64-v8a
```

> A larger build environment is required when the constrained sandbox cannot complete Metro and Gradle packaging together. The local debug keystore must not be uploaded to an external build service.
