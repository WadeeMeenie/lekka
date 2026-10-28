# Changelog

## Unreleased — 2026-10-28

### Added

- A pnpm lockfile and pinned CI package-manager setup with frozen dependency installs.
- Direct development dependencies for the Babel parser, JSX transform, Expo Doctor, NativeWind-compatible Tailwind CSS 3.4 peer, and CSS interop runtime; NativeWind/CSS interop are upgraded together to 4.2.1/0.2.1 and the custom Android plugin uses Expo's public config-plugins export.
- An additive Supabase migration and regression tests for private-community self-joins, nearby location/radius validation, privacy/block authorization, and least-privilege RPC execution.
- A public-key-only `.env.example`, project README, project-specific Supabase migration guidance, and launch issue/status register.

### Fixed

- Authentication layout now scrolls and adjusts for the soft keyboard on compact Android screens.
- CI invariant checks now match the pnpm commands actually run.
- Expo's Android prebuild workflow now uses `CI=1` rather than its unsupported `--non-interactive` flag; Gradle bundling explicitly uses `NODE_ENV=production`.

### Verification and release status

Local verification passed on NativeWind/CSS interop 4.2.1/0.2.1: TypeScript, 180 tests (2 skipped), route interaction audit, production invariants, Expo dependency compatibility, Expo Doctor (18/18), frozen lockfile install, and production-mode Expo Android prebuild. ESLint exits with 0 errors and 15 warnings. GitHub run `40766781520` built standard debug but failed internal debug and the release gate because the CSS interop Babel preset could not resolve `@babel/plugin-transform-react-jsx`; the package is now directly declared. A fresh local production Android export passes that resolution point but still fails in the Worklets/Babel transform for Reanimated `timing.ts` with `Cannot read properties of undefined (reading 'length')`. The updated dependency fix has not yet completed CI. No current-source APK, staging migration execution, owner-level PostGIS grant remediation, or device/account acceptance is complete. The release remains **NOT READY**; see `docs/LAUNCH_EXECUTION_STATUS.md`.
