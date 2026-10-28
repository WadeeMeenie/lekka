# Lekka

Lekka is an Android-first Expo / React Native application for South African neighbourhood discovery, community posts, local businesses, and social features. The mobile app uses Expo Router and the existing Supabase project for authentication, PostgreSQL/PostGIS, Storage, Realtime, and Edge Functions.

## Requirements

- Node.js 22
- pnpm 9.12.0 (declared in `package.json`)
- Java 17 and Android SDK platform/build tools for local Android builds
- A Supabase project and its **publishable** client key for local development

Never put a Supabase service-role key in an `EXPO_PUBLIC_*` variable, a mobile build, or this repository.

## Install and verify

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm audit:interactions
pnpm audit:production
pnpm test
pnpm lint
pnpm exec expo config --type public
pnpm exec expo install --check
pnpm exec expo-doctor
```

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for a local development environment. Public client values are embedded in the app by design; keep privileged credentials server-side in Supabase Edge Function secrets.

## Android builds

The canonical application ID is `com.app.localradarsa`. Native files are generated from the Expo configuration and are intentionally not committed:

```sh
CI=1 pnpm exec expo prebuild --no-install --clean
cd android
./gradlew :app:assembleDebug --no-daemon
./gradlew :app:assembleInternalDebug --no-daemon
```

GitHub Actions runs those debug build variants and uploads the APKs as workflow artifacts. The EAS configuration currently defines an internal preview APK profile. A production-signed store release still requires the authorized signing/distribution configuration and validation of the exact source commit; do not treat an old APK or a debug artifact as a production release.

## Supabase safety

The live project is the existing `vnitwsjidlurlwlpsmtf` project in `eu-west-1`. **Do not create a replacement project or blindly replay the migration directory on production.** The existing live migration history includes versions and names that differ from some checked-in migration filenames. Reconcile the remote history and schema before applying pending migrations; review [Supabase's project-specific migration notes](supabase/README.md) and the [launch execution status](docs/LAUNCH_EXECUTION_STATUS.md). The current hardening migration in this branch is additive and has not been applied to production.

## Project docs

- [Screen-by-screen UX audit](docs/SCREEN_BY_SCREEN_UX_AUDIT.md)
- [Release readiness checklist](docs/RELEASE_READINESS.md)
- [Current launch execution status and issue register](docs/LAUNCH_EXECUTION_STATUS.md)
- [Supabase setup and migration guidance](supabase/README.md)

A passing CI run is not a substitute for production RLS testing with separate test accounts, Supabase-owner-only maintenance, payment-provider checks, or physical Android device validation. The launch-status document records what is verified and what is still blocked.
