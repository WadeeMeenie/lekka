# Launch test report — 14 October 2026

PASS means the named scope executed successfully; source assertions do not establish live behavior.

| Test | Result | Evidence |
|---|---|---|
| Baseline TypeScript | PASS | `npm run check`, exit 0 |
| Baseline Vitest | PASS with skips | 133 passed, 2 skipped; alternate programmatic runner due Windows esbuild config traversal failure |
| Outbox regression before fix | FAIL (expected) | 3/4 failed: lost concurrent save; 2 create calls instead of 1; stale completed draft retained |
| Outbox regression after fix | PASS | 4/4, includes retry after rejection |
| Browser/native media byte reader | PASS | 3/3: actual data-URL bytes, HTTP error rejection, native adapter |
| Candidate full Vitest | PASS with skips | 144 passed, 2 skipped, 32 files; same alternate runner with @ alias |
| Expo lint | PASS with warnings | 0 errors / 14 warnings; run via pnpm on PATH |
| Interaction audit | PASS | 36 source files; after declaring parser dependency |
| Production invariant audit | PASS | 36 route/source files; rerun after final edits |
| Frozen install | PASS | pnpm 9.12.0 hoisted install; no resolution change; lifecycle scripts disabled locally |
| Expo compatibility | PASS, limited | Offline bundled SDK compatibility check reports up to date; online doctor pending |
| Web export | PASS | Final Expo production export: 40 static routes, 2.98 MB uncompressed JS entry. Initial CSS-cache issue cleared on retry. |
| Auth-settings integration test | BLOCKED / skipped | No backend configuration supplied to local suite |
| Expo token check | NOT TESTED / skipped | No Expo credential supplied |
| Historical nine failures | BLOCKED | Need target backend and safe accounts |
| Registration/profile/post/reaction/comment/share/community/discovery/logout journey | BLOCKED | No live authenticated multi-user run |
| RLS allowed and denied operations | BLOCKED | No database session; static migration tests are not policy execution |
| Browser auth visual checks | PASS within scope | 390x667 and 1280x800: theme contrast repaired, signup scroll reachable, labelled fields, empty-form validation and reset navigation. Other routes and native devices NOT TESTED. |
| LCP/INP/CLS | NOT TESTED | No field measurement; no before/after claims |

Reproduction for Windows alternate runner: use `startVitest` from `vitest/node`, `run:true, config:false`, Node environment, and the same react-native/AsyncStorage mock aliases as vitest.config.mts plus `@` to repository root. Normal CI continues to use npm test and its checked-in Vitest config. This workaround is not a production code change.

Additional final evidence: public target Supabase /auth/v1/settings returned HTTP 200 using the repository publishable key. This separate read-only smoke test does not validate RLS, credentials, email delivery or live user workflows. Full-suite integration test remained skipped. Post-owner regression failed before fix and passes 3/3 after; media attachment retry regression failed before fix and passes after. Final source checks and web export passed after these changes.


CI follow-up: first Linux run passed install, TypeScript, static audits, tests (145 pass / 1 skip, including public auth-settings integration) and lint, but failed cold web export because NativeWind created web.css after Metro's crawl. metro.config.cjs now initializes that placeholder before crawling. A local export with web.css removed and --clear passed all 40 routes; generated CSS remains populated by NativeWind. Follow-up Linux CI is pending. Android build is pending. No deployment.
