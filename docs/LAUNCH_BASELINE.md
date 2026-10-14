# Launch baseline — 14 October 2026

Verdict: **NOT READY**. This is an incomplete launch assessment, not certification.

Repository: https://github.com/WadeeMeenie/lekka; default branch `main`.
Baseline: `000a17aff5e9beed8be3807eb9962c5af8c2d836` (11 October 2026).
Working branch: `codex/launch-readiness-20261014`. Fresh isolated clone; original working tree clean. No AGENTS.md found in the checkout. Recent commits include Supabase social-flow repairs, hardening, and community recursion tests. Their descriptions are historical claims, not fresh live evidence.

## Verified architecture

- Expo SDK 54 / React Native 0.81.5 / React 19.1, Expo Router and Metro; **not Vite**. Native Android/iOS plus configured static web output.
- Entry: `expo-router/entry`; provider tree `app/_layout.tsx`. Five tabs: feed, nearby, create, social, local. Dynamic post, profile, business and community screens.
- Styling: NativeWind, `global.css`, `theme.config.js`, `constants/theme.ts`, `lib/_core/theme.ts`, theme provider, screen-level StyleSheets. Existing themes retained.
- React local state, React Query provider, AsyncStorage caches/outbox and Supabase subscriptions. Auth hook is instantiated by multiple screens.
- Backend: `lib/supabase.ts`, repository/service modules; migrations and Deno Edge Functions under `supabase/`. CI points to `vnitwsjidlurlwlpsmtf`.
- Existing Vitest tests include many source-text assertions. Those do **not** execute SQL or prove RLS isolation.
- CI: `.github/workflows/lekka-validation.yml`; Android build configuration: `app.config.ts`, `eas.json`, `codemagic.yaml`. Existing release documentation retained and linked from the new runbook.

## Baseline execution

Host: Windows, Node 24.15.0, npm 11.12.1. Repository declares pnpm 9.12.0; CI uses Node 22. This host is not identical to CI.

| Check | Initial result | Evidence / limitation |
|---|---|---|
| Locked install | BLOCKED | No lockfile tracked at baseline; CI used unconstrained npm install. Resolved existing ranges with pnpm 9.12.0, scripts disabled, using a workspace-local store. This cannot reconstruct the exact previous production dependency tree. |
| TypeScript | PASS | `npm run check`, exit 0 |
| Existing tests | PASS with skips | 133 passed / 2 skipped; programmatic Vitest entry using equivalent aliases because config bundling hit Windows parent-directory access denial |
| Standard `npm test` | BLOCKED locally | esbuild failed to resolve config while traversing a parent directory, including after read permission was granted |
| Lint | PASS with warnings | With pnpm on PATH: Expo lint 0 errors, 14 warnings. Earlier npm invocation returned 0 despite missing pnpm; that was not counted as a pass. Broad direct ESLint additionally flags Deno URL imports outside Expo lint scope. |
| Interaction audit | FAIL then PASS | Missing declared `@babel/parser` dependency under isolated pnpm; passes after adding it |
| Production invariant audit | PASS | 36 route/source files checked; static only |
| Production web export | FAIL | Missing react-native-web; then unresolved CSS interop under pnpm isolated linking; then Metro generated CSS cache SHA-1 failure. See test report for final retry. |
| Live Supabase catalog/advisors | BLOCKED | Initially only inactive signworx-flow / signworx-calendar visible; target project returned permission denied. After user confirmed linking, connector returned Unknown tool. |
| Live multi-user workflows / RLS | BLOCKED | No accessible target backend, staging project or disposable test accounts |
| Android/iOS physical device | NOT TESTED | No configured device or signed candidate artifact |

## Migration and deployment restrictions

Nine migration version prefixes are duplicated: 202608230001, 202608230002, 202608230003, 202608230005, 202608230006, 202608230007, 202608230008, 202608240001, 202608270001. Existing release docs also warn about live migration drift. Do not rename, replay or deploy this history until reconciled against the live catalog. No local Docker, psql or Supabase CLI was found on PATH. No database mutation was performed.
