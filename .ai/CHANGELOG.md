# Candidate changes

2026-10-14: cloned verified repository; established baseline; researched primary documentation; created issue register and continuation state. Added executable outbox race regression (3 failures before fix, 4 passes after), queue serialization, browser media reader with three tests, web dependencies/parser, dependency lock and frozen CI/web-export gate. Database migrations: none. Live backend mutations: none. Production deployment: none.

Follow-up: owner binding (red/green 3 tests), acknowledged photo upload retry (red/green test), composer checkpoints, audience label correction, shared theme palette/background, responsive auth and accessible labels, removal of nonexistent OAuth screen registration. Final total 144 pass / 2 skipped. Browser auth visual checks and export passed; public auth endpoint HTTP 200.


Cold export fix: initialize NativeWind web CSS placeholder before Metro crawl. Reproduced in Linux CI; verified local export after removing generated web.css and clearing Metro cache. NativeWind still generates stylesheet contents.

2026-10-14 staging follow-up: Supabase connection restored; read-only metadata confirms effective PostGIS grant exposure and policy/RPC discrepancies requiring staging reproduction. Added strict target guards, frontend staging configuration check, read-only preflight, migration audit, blank env template and 21 regressions (full suite 165 pass / 2 skip). See STAGING_READINESS.md. No staging provisioned: account quote tool unavailable; user authorized organization selection for quote only. Production unchanged.

Staging review follow-up: fixed three red/green guard regressions, added production-reference detection to migration audit, compared recorded SQL for all migrations and documented ordered staging-only review/replay gates. 168 tests passed / 2 skipped; no live mutation. See STAGING_REPLAY_REVIEW.md.

Final handoff: added reusable Windows native-config local test runner and TESTING.md. Local test/build checks pass within documented scope; no paid service or production change. Exact dd13efc CI passed; final documentation/runner commit requires its own workflow result.
