# Lekka production launch and scale plan

This is an operational gate, not a claim that the current project has passed it. CI and a successful build are necessary but do not demonstrate capacity for millions of users.

## 1. Release blockers

- Resolve all high/critical Supabase Security Advisor findings and verify effective grants after changes.
- Reconcile the repository migrations against `supabase_migrations.schema_migrations` before running migrations. Do not move extension-owned PostGIS objects or change their owners as a quick workaround.
- Review every client-executable `SECURITY DEFINER` function for identity checks, fixed `search_path`, input validation, bounded work, and least-privilege grants.
- Enable leaked-password protection and confirm email/OAuth redirects, recovery, session refresh, and account deletion.
- Exercise storage ownership, signed URL expiry, cleanup retries, and cross-account isolation.
- Exercise Yoco sandbox payment success, failure, cancellation, refund, duplicate webhook, replay, amount validation, and ownership validation.
- Verify production bundle has only public client credentials; service-role and provider secrets must remain server-side.

## 2. Performance and capacity

1. Establish a staging project with schema and realistic synthetic data distributions. Never run a ramp test against production by default.
2. Capture baseline metrics: p50/p95/p99 request latency, HTTP 4xx/5xx, database CPU/memory, pool saturation, query duration, locks, storage latency, and edge-function errors.
3. Use `scripts/k6/discovery-readonly.js` for the first read-only discovery ramp. Supply a test account token and coordinates for a seeded staging area.
4. Increase traffic gradually: 5, 10, 25, 50, 100, then higher virtual users only while error/latency thresholds hold. Run representative feed, profile, comments, messaging, and business queries as separate scenarios after each endpoint's safe read/write semantics are documented.
5. Test writes only with disposable synthetic accounts and unique test data; implement cleanup. Do not use production write tests.
6. Test a sustained soak, burst recovery, and graceful degradation. Record the maximum stable request rate and the bottleneck at each stage.
7. Size Supabase compute, connection pooling, Auth email capacity, Storage/CDN, Edge Functions, and monitoring to measured traffic. A million registered accounts is not the same as a million concurrent users.

## 3. Data and application controls

- Use bounded pagination and query limits for every feed/search endpoint; avoid unbounded selects.
- Verify indexes with real query plans and representative row counts. Avoid deleting indexes solely because a low-traffic test environment marks them unused.
- Check RLS policies under anon, user A, user B, blocked users, and service role; include private profiles/posts and community membership boundaries.
- Replace client-side SELECT-then-write toggles with atomic server-side operations or idempotent mutations before high-concurrency launch.
- Ensure retries are safe, especially for payments, messages, uploads, and notification jobs.
- Confirm observability excludes passwords, tokens, signed URLs, and sensitive precise location from logs.

## 4. Availability and recovery

- Confirm backup/PITR plan, retention, restore test, and recovery time/objective targets.
- Define rollback steps for app releases and forward-fix/rollback policy for database changes.
- Configure uptime checks and alerts for elevated 5xx, p95 latency, auth failure spikes, queue backlog, webhook failures, database saturation, and storage failures.
- Publish support and incident escalation ownership before public launch.

## 5. Exit criteria

Do not mark ready until: exact-commit CI is green; security findings are remediated or explicitly risk-accepted with evidence; device and multi-account flows pass; payment sandbox flows pass; a staging load test meets agreed p95/error thresholds at the expected peak and headroom; restore and rollback are rehearsed; and a signed release artifact installs and upgrades successfully.
