# Changelog

## Unreleased — 2026-10-28

### Added

- A pnpm lockfile and pinned CI package-manager setup with frozen dependency installs.
- Direct development dependencies for the Babel parser used by the interaction audit and the Expo Doctor compatibility check.
- An additive Supabase migration and regression tests for private-community self-joins, nearby location/radius validation, privacy/block authorization, and least-privilege RPC execution.
- A public-key-only `.env.example`, project README, project-specific Supabase migration guidance, and launch issue/status register.

### Fixed

- Authentication layout now scrolls and adjusts for the soft keyboard on compact Android screens.
- CI invariant checks now match the pnpm commands actually run.
- Expo's Android prebuild workflow now uses `CI=1` rather than its unsupported `--non-interactive` flag.

### Verification and release status

Local verification passed: TypeScript, 180 tests (2 skipped), route interaction audit, production invariants, Expo dependency compatibility, Expo Doctor (18/18), frozen lockfile install, and Expo Android prebuild. ESLint exits with 0 errors and 15 warnings. These results do not include GitHub Actions for this implementation, a built APK, staging execution of the database migration, owner-level PostGIS grant remediation, or device/account acceptance. The release remains **NOT READY**; see `docs/LAUNCH_EXECUTION_STATUS.md`.
