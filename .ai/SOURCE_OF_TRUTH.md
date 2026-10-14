# Lekka: source of truth

This file is the active implementation guide. Older root-level audit/release reports were snapshots, not current architecture or instructions. Use the code, live Supabase schema, and current migrations as authoritative evidence.

## Non-negotiable backend rule
- Supabase is the sole source of truth for accounts, profiles, posts, media metadata, reactions, comments, follows, communities, messages, local businesses, events, deals, and discovery.
- Authenticated reads/writes must use the single client in `lib/supabase.ts`, the active repository/service module for that feature, and the real Supabase tables/RPCs listed below.
- AsyncStorage may store user preferences, location choices, and explicitly queued offline drafts. It must not invent feed rows or silently replace a failed Supabase response with stale cached posts.
- Never ship hardcoded sample people, posts, businesses, engagement counts, distance labels, or fake ranking heuristics as real user content.
- Do not silently swallow backend errors. Surface a useful error and log enough context to diagnose it without logging passwords, tokens, or private content.
- CI must never fall back to the production Supabase URL/key. Do not apply production migrations until the exact SQL and ownership requirements have been reviewed and validated.

## Active feature paths
- Auth/session: `lib/supabase.ts`, `hooks/use-supabase-auth.ts`, `app/auth*`, `app/index.tsx`.
- Profiles/privacy/avatar: `lib/profile.ts`, `lib/profile-privacy.ts`, `lib/profile-settings.ts`, `lib/profile-avatar.ts`.
- Posts/feed/media: `lib/supabase-repository.ts`, `lib/social-repository.ts`, `lib/post-social.ts`, `lib/post-actions.ts`, `lib/atomic-social.ts`, `lib/offline-outbox.ts`.
- Communities: `app/community/**`, `lib/community-management.ts`.
- Nearby/local discovery: `lib/discovery.ts`, `lib/location.ts`, Supabase RPCs `discover_nearby`, `nearby_feed_posts_page`, and the relevant live migration definitions.
- Business accounts: `lib/account-repository.ts` and the corresponding `businesses` / `business_members` tables and RPCs.
- Database change history: `supabase/migrations/**`; verify against live `supabase_migrations.schema_migrations` and live object definitions before deployment.

## Current release blockers (2026-10-14)
1. Live production Supabase has not been verified end-to-end for two-account sign-up/login, profile edits/avatar/privacy, create/read posts and media, reactions/comments, community create/join/post, and nearby discovery.
2. Production migration history contains duplicate version prefixes and historical migrations with unsafe production-bound cleanup references. Do not replay the directory blindly.
3. The connected SQL role cannot alter/revoke privileges on `public.spatial_ref_sys` because it does not own the table; resolve with the authorized owner/admin path.
4. The live database has anonymous execute grants on community helper functions and PostGIS extent overloads that require reviewed remediation.
5. Do not call a feature fixed because a static test passes. Require CI, migration-level regression coverage, live permission verification, and authenticated user-flow evidence.

## Workflow for every fix
1. Trace the screen to its service/repository, actual table/RPC, grants, RLS policies, and migration history.
2. Remove dead/duplicate paths only after proving no active imports depend on them.
3. Add a regression test that reproduces the defect.
4. Run type-check, lint, unit/integration, isolated SQL tests, web export, and Android build.
5. Apply database changes only through the authorized path; query live privileges/policies afterward.
6. Record what was changed, the exact commit, tests, and anything still blocked. Never describe an unverified feature as working.
