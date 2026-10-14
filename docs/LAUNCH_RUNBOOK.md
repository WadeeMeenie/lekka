# Candidate validation and release runbook

Existing operational detail remains in [release readiness](RELEASE_READINESS.md), [scale plan](PRODUCTION_SCALE_PLAN.md) and `../VALIDATION_RUNBOOK.md`. This document records the current candidate sequence rather than superseding historical evidence.

1. Checkout the candidate commit and use Node 22 / pnpm 9.12.0. Run `pnpm install --frozen-lockfile`; inspect lifecycle scripts in your trusted CI environment. The new lock is a first resolved snapshot, not the former production tree.
2. Run `pnpm check`, `pnpm test`, `pnpm lint`, both audit scripts, `pnpm exec expo install --check`, Expo doctor, and `pnpm exec expo export --platform web`. Record skips and warnings. Use only public client configuration for browser builds.
3. Restore target Supabase access. Read migration history and compare duplicate version prefixes/content before any apply. Read catalogs, policies, grants, indexes, triggers, RPC definitions/owners/search paths, Storage buckets/policies, Edge versions and security/performance advisors. Do not inspect customer rows unnecessarily.
4. Establish staging/disposable A/B/C accounts and moderator/business roles. Confirm anon denial, ownership, private community membership, blocks, restricted profile fields, upload/read/delete and signed URL expiry. Run the ten-step journey in the master directive. Do not run destructive tests against production.
5. Verify every route on mobile and desktop, keyboard and screen reader, small-height signup, permission denial, empty/error/retry and expired sessions. Verify physical Android/iOS behavior separately from web.
6. Measure web vitals and staging latency, query plans and load. Agree throughput and p95 budgets from expected traffic. Initial web target: p75 LCP <=2.5 s, INP <=200 ms, CLS <=0.1; not measured yet.
7. Assign operational owners, legal review, Information Officer/support channels, moderation, retention/deletion, breach escalation and monitoring. Validate backup restore and rollback in staging.
8. Review exact-commit CI, diff and every unresolved High/Critical item. Obtain separate approval for production deployment and any risky database operation.

Rollback: record current application artifact/commit and schema versions before release. App rollback may select a previously verified compatible artifact. Database changes require a reviewed forward-fix or backup restoration plan; never blindly reverse security policies or replay duplicate migrations. No new database migration is included in this candidate.

Post-deploy (only after approval): verify health, auth, two-user core journeys, error rates and rollback trigger thresholds. Record actual URL/artifact, time, commit and operator. Deployment has not occurred.
