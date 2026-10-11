# Backup, restore, monitoring, and performance readiness — 2026-10-11

## Status: NOT VERIFIED

The Supabase project is `ACTIVE_HEALTHY`, but no backup-retention configuration, point-in-time recovery setting, restore drill, recovery-time objective, recovery-point objective, or rollback rehearsal was available in the inspected evidence. The repository has migration history and cleanup scheduling, but migration history is not a backup.

## Required recovery plan

Maintain a versioned migration release manifest containing the candidate SHA, live migration ledger snapshot, Edge Function versions/hashes, required secrets by name only, storage bucket/prefix configuration, and rollback decision points. Before production deployment, create or validate a platform backup, apply schema changes on a disposable branch, restore a representative backup to an isolated project, run RLS/payment/auth smoke tests, and record measured RPO/RTO. Do not use destructive rollback SQL for irreversible data changes.

## Monitoring

The code contains structured error handling, Supabase logs, webhook persistence, a cleanup queue, and a cron-driven cleanup path. No complete alerting policy or dashboard evidence was verified. Production monitoring must alert on Edge Function 5xx rates, webhook signature failures, payment transition failures, queue age, cleanup failures, Auth failures, database saturation, and backup/restore failures without logging credentials, raw tokens, webhook secrets, or private user content.

## Performance

Supabase performance advisors report 39 auth-RLS init-plan findings, 58 multiple-permissive-policy findings, and 26 unused indexes. These findings are not a capacity test. The critical feed/discovery queries, RLS plans, realtime subscriptions, media signing, and webhook path require staging load tests with representative but synthetic data. Do not run disruptive load against production. Current tested capacity is unknown.

Release status remains **NOT READY** until an operator supplies backup/restore evidence, rollback evidence, monitoring/alerts, and measured staging capacity.
