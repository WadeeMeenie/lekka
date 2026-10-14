# Test Lekka on Windows — no paid services

Requires Git and Node.js 22.18+ (or Node 24). The app is Expo/React Native with web support, not Vite. These commands do not provision Supabase or modify production.

## Setup

```powershell
git clone --branch codex/launch-readiness-20261014 https://github.com/WadeeMeenie/lekka.git lekka-test
Set-Location lekka-test
npx.cmd --yes pnpm@9.12.0 install --frozen-lockfile
```

If already using this checkout, preserve your changes and use its existing directory instead of cloning over it. Dependency download needs internet; the test route itself needs no paid account.

## Tests, type checks, lint and static audits

```powershell
node scripts/test-local.mjs
npx.cmd --yes pnpm@9.12.0 run check
npx.cmd --yes pnpm@9.12.0 run lint
npx.cmd --yes pnpm@9.12.0 run audit:interactions
npx.cmd --yes pnpm@9.12.0 run audit:production
```

The local runner uses the same checked-in Vitest config without esbuild's Windows config loader. It removes backend/Expo credentials inside its own process. Expected baseline: 168 passed, 2 skipped (backend reachability and Expo token). Skips are not integration passes. CI uses the normal `pnpm test` command.

## Start the web app without contacting production

```powershell
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_NO_TELEMETRY = '1'
$env:EXPO_PUBLIC_SUPABASE_URL = ''
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ''
$env:EXPO_PUBLIC_APP_ENV = ''
$env:EXPO_PUBLIC_STAGING_PROJECT_REF = ''
npx.cmd --yes pnpm@9.12.0 exec expo start --web --port 8081
```

Open **http://localhost:8081/auth**. If that port is occupied, stop the other server or choose another port and use Expo's printed URL. This previews real UI, form validation and navigation; signup, posts and database workflows correctly remain unavailable without a backend. It does not fabricate successful actions. Stop with Ctrl+C.

Production web build, using the same no-backend environment above:

```powershell
npx.cmd --yes pnpm@9.12.0 exec expo export --platform web --clear --max-workers 2
```

## Database tests: currently BLOCKED

Docker/Supabase CLI are not available in the verified workspace and no disposable database exists. Do **not** run `supabase db reset`, `db push`, seed, cleanup or replay against production. Installing Docker alone does not make the current history safe to replay.

```powershell
node scripts/staging/audit-migrations.mjs
```

Expected exit code is **1**: nine duplicate migration prefixes and three production cleanup references remain. This detects the hazard; it does not suppress or repair it. Follow `docs/STAGING_REPLAY_REVIEW.md` before creating a separate, reviewed local baseline. Original migration files and production history are intentionally preserved.

For an independently verified, approved existing staging project only, export the following in a separate PowerShell session. Replace every placeholder; never use production `vnitwsjidlurlwlpsmtf`:

```powershell
$env:LEKKA_TEST_ENVIRONMENT = 'staging'
$env:LEKKA_STAGING_PROJECT_REF = '<approved-staging-project-ref>'
$env:LEKKA_STAGING_CONFIRM_PROJECT_REF = $env:LEKKA_STAGING_PROJECT_REF
$env:LEKKA_STAGING_URL = "https://$($env:LEKKA_STAGING_PROJECT_REF).supabase.co"
$env:LEKKA_STAGING_PUBLISHABLE_KEY = '<staging-publishable-key>'
node scripts/staging/preflight.mjs
```

Preflight is read-only and requires the approved exact hosted project. Local loopback Supabase is deliberately not yet allowed by this guard; adding it requires a separate loopback-only identity check and reviewed schema. A successful Auth probe is not proof of RLS, signup, cleanup or schema readiness. Do not use service-role keys in Expo variables. No upgrade, paid project, production change or deployment is part of this test route.
