# Final release checklist — 2026-10-11

## Decision: NOT READY

| Blocker | Root cause/evidence | Local action | Required external action | Status |
|---|---|---|---|---|
| Migration drift | Live ledger through `20261011203434`; Git ends 2026-09-06 | Added parity report and source review | Choose source of truth; reconcile reviewed migrations/functions | BLOCKED |
| PostGIS exposure | `supabase_admin` owns all three overloads; client ACLs remain effective | Added exact elevated remediation and verification query | Supabase/platform owner must alter ACL or supported exposure | BLOCKED |
| Modern publishable-key 401 | Live gateway rejects modern key while legacy anon succeeds | Preserved secure client architecture; documented mismatch | Project owner corrects/rotates gateway key config; rerun integration test | BLOCKED |
| OAuth state binding | Callback state is not independently browser-bound | Preserved existing flow; risk documented | Implement server/browser nonce and replay tests | PARTIALLY RESOLVED |
| Leaked-password protection | Supabase advisor says disabled | No client workaround | Enable in Auth settings if supported; verify | BLOCKED |
| RLS-no-policy tables | Five server-only tables have no policies but no client grants | Verified least-privilege ACLs; no unnecessary policies added | Keep server-only classification and monitor grants | PARTIALLY RESOLVED |
| Yoco source/deployment drift | Deployed v11 checkout still has unconditional return defect | Aligned repo checkout/webhook and expanded security tests | Review and deploy corrected Edge Functions; run isolated TEST payment; see `docs/YOCO_DEPLOYMENT_PROPOSAL_2026-10-11.md` | BLOCKED |
| Social/category journeys | UI/static paths exist, but isolated persistence and unauthorized tests were not run | Added workflow gap report | Run test-account E2E matrix; implement structured category flows where promised | NOT TESTED |
| Privacy/legal/deletion | No verified public policy/consent/account deletion evidence | Documented gap; no legal claim | Operator/legal adviser confirms POPIA-facing terms and implements deletion | NOT READY |
| Backup/recovery/monitoring | No restore drill, RPO/RTO, rollback, alert evidence | Added recovery plan | Platform/ops owner runs and records drills | NOT VERIFIED |
| Android/device | Web only was verified | Preserved native build config; documented test plan | Build/install and test on emulator/device | NOT TESTED |

## Passing local evidence

The critical-blocker validation run reported **119 passed and 3 skipped** across 31 test files. The focused Yoco source-alignment test passed **6/6**. TypeScript, lint with zero warnings, static interaction/production audits, server build, and Expo web export all passed. The three skips are: the Supabase REST test because `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were not supplied; the manual Expo-token test because `RUN_EXPO_TOKEN_TEST=true` was not enabled; and the entire auth.logout suite because it is explicitly marked TODO/skip pending authentication implementation. None was silently converted to a pass.

## Do not release until

The candidate SHA is reproducible against the production backend source, PostGIS exposure is verified closed or formally accepted by the platform owner, the corrected Yoco function is deployed and tested in provider TEST mode, the publishable-key integration check passes, and backup/restore, monitoring, legal, and native-device evidence is recorded.

Fresh live evidence remains separate from local evidence in `docs/evidence_live_production_2026-10-11.md`. No production schema, payment, Edge Function, or data change was performed.
