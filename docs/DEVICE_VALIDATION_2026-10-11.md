# Device validation — 2026-10-11

## Status: NOT TESTED on representative device

The repository preserves a native Expo/React Native implementation. `app.config.ts` defines Android permissions, deep-link filters, Expo Router, location, audio, video, and the internal Android build variant. `codemagic.yaml` defines an installable `assembleInternalDebug` APK build using Expo 54, React Native 0.81.5, Reanimated 4, Worklets, and the New Architecture.

The sandbox verified the Expo web export and browser smoke flow only. No Android SDK/emulator or physical Android device was available for this closure pass, so there is no evidence for native authentication, deep-link return handling, media permissions, keyboard/scroll behavior, layout, session restoration, or upload behavior on a representative device.

The required next test is the Codemagic/internal-debug build at the candidate SHA, installed on at least one supported Android device or emulator. Exercise registration, onboarding, account switching, sign-out, password recovery, Yoco TEST return, location permission denial/grant, image selection/upload, keyboard forms, feed refresh, post/comment actions, and offline retry. Record OS version, device, build artifact hash, test identities, and failures. Do not label Android ready from web evidence.
