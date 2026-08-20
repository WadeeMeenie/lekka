# Local Radar SA Supabase backend

The project now contains a Supabase-compatible client, a first PostgreSQL migration, RLS policies, a private media bucket policy, and realtime publication boundaries. The Android client uses only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; service-role credentials must never be bundled into the app.

## Migration status

The migration is stored at `supabase/migrations/202608200001_local_radar_core.sql`. It creates profiles, interests-in-profile, follows, communities, memberships, businesses, posts, post media, comments, reactions, saved posts, reports, and notifications. It also adds PostGIS location columns and indexes, the `nearby_radar` RPC, an auth-user profile trigger, RLS policies, a private `local-radar-media` bucket, and realtime publication entries for posts, comments, and notifications.

No Supabase project was returned by the connected project discovery endpoint during this milestone, so the migration has been prepared but not remotely applied. Once a project is available, apply the migration through the Supabase SQL/migration workflow, then generate TypeScript types and review the security/performance advisors. The app remains usable with its AsyncStorage cache and seeded fallback while the migration is pending.

## Runtime behavior

The feed attempts a backend query first, writes fresh results to the local cache, and falls back to cached content on network or authentication failure. Local Radar attempts the `nearby_radar` RPC and falls back to the existing local discovery cards if no remote rows are returned. Authenticated users publish through the `posts` table. Anonymous or offline users retain a local draft rather than losing their written content.

The location helper requests foreground permission only when the user explicitly taps the location action. It rounds coordinates before any future server handoff and preserves the manual Bellville fallback when permission is denied, services are disabled, or the app is running on web.

## Required project-side follow-up

Create or connect a Supabase project, apply the migration, enable email/password authentication, and configure the redirect URLs for the native deep-link scheme. Then seed public communities and businesses through an authenticated/admin-safe process. Before production release, run the Supabase security and performance advisors and verify Storage policies with a non-admin test account.
