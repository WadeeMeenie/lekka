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
| Yoco source/deployment drift | Deployed functions differ; primary deployed checkout has unconditional return defect | Aligned repo checkout/webhook and added security tests | Review and deploy corrected Edge Functions; run isolated TEST payment | BLOCKED |
| Social/category journeys | UI/static paths exist, but isolated persistence and unauthorized tests were not run | Added workflow gap report | Run test-account E2E matrix; implement structured category flows where promised | NOT TESTED |
| Privacy/legal/deletion | No verified public policy/consent/account deletion evidence | Documented gap; no legal claim | Operator/legal adviser confirms POPIA-facing terms and implements deletion | NOT READY |
| Backup/recovery/monitoring | No restore drill, RPO/RTO, rollback, alert evidence | Added recovery plan | Platform/ops owner runs and records drills | NOT VERIFIED |
| Android/device | Web only was verified | Preserved native build config; documented test plan | Build/install and test on emulator/device | NOT TESTED |

## Passing local evidence

The latest verified local baseline reported passing TypeScript, lint with zero warnings, full unit suite with three skips, static interaction/production audits, server build, and Expo web export. The focused Yoco source-alignment test was added in this pass and must be run with the final suite.

## Do not release until

The candidate SHA is reproducible against the production backend source, PostGIS exposure is verified closed or formally accepted by the platform owner, the corrected Yoco function is deployed and tested in provider TEST mode, the publishable-key integration check passes, and backup/restore, monitoring, legal, and native-device evidence is recorded.
