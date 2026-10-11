# Production scale plan

## Current evidence

The database has PostGIS and multiple spatial/indexed access paths. Supabase performance advisors currently report 39 RLS initialization-plan warnings and 58 multiple-permissive-policy warnings, plus unused indexes. These are signals for measured follow-up, not proof that every index should be removed.

## Before launch

1. Reconcile live migrations and repository files.
2. Capture `EXPLAIN (ANALYZE, BUFFERS)` for nearby feed, nearby detail, business discovery, social pagination, and payment-order reads against a representative non-production dataset.
3. Replace repeated `auth.*()` calls in hot RLS policies with init-plan-safe `(select auth.*())` forms where semantics remain unchanged.
4. Consolidate overlapping permissive policies only after policy-equivalence tests for anonymous, authenticated, owner, member, blocked, and private-content cases.
5. Measure image payload sizes, Storage access latency, mobile render cost, and retry behavior.
6. Verify Edge Function timeout/error metrics, webhook retry alerts, queue backlog alerts, and database connection limits.
7. Run bounded read-only load tests against an approved environment. Do not load-test production without explicit authorization.

## Recovery

Every migration needs a forward verification query and a recovery plan. Database backups and a restore drill are currently **NOT VERIFIED**. Payment reconciliation and webhook replay procedures are also **NOT VERIFIED**.
