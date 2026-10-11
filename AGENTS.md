# Lekka engineering rules

## Scope and architecture

Lekka is an Expo Router React Native application targeting Android, iOS, and web. Supabase provides Auth, PostgreSQL, PostGIS, Storage, Realtime, and Edge Functions. The repository also contains a small Express/tRPC server used by selected platform capabilities. Treat Supabase migrations and deployed Edge Functions as production interfaces.

## Safe change rules

- Inspect the current branch, exact SHA, migrations, deployed configuration, and tests before editing.
- Never force-push, reset, merge a release PR, delete production data, or make an unreviewed production write.
- Every database change must be a reviewed, versioned migration committed with the code change.
- Keep service-role credentials and provider secrets out of source, logs, fixtures, screenshots, and reports.
- Keep client access publishable-key-only. Privileged payment, moderation, Storage, and administration operations belong behind authenticated server or Edge Function boundaries.
- Configure production credentialed CORS with an explicit comma-separated `CORS_ALLOWED_ORIGINS` allowlist; never restore request-origin reflection.
- Do not weaken RLS, grants, security-definer search paths, webhook verification, or payment transition guards to make a test pass.
- Synthetic test data only. Never charge live customers during validation.

## Required checks

Run the applicable checks before and after changes:

```bash
npm run check
npm run audit:interactions
npm run audit:production
npm test
npm run lint
npm run build
npx expo config --type public
```

For native changes also run the CI Android prebuild and Gradle debug builds. Record the exact SHA and any unavailable checks. A passing build is not a release recommendation by itself.

## Database and release discipline

The live Supabase migration history must be compared with `supabase/migrations` before release. Production drift is a release blocker until reconciled or explicitly accepted by the owner. Treat Supabase advisor findings as evidence to investigate, not as automatically safe to ignore.
