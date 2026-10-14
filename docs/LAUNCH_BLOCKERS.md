# Launch blockers

**Lekka is not ready for public launch.**

1. **High / access:** Target Supabase `vnitwsjidlurlwlpsmtf` initially denied access; after user said linked, calls returned Unknown tool. Need functioning connector scoped to the actual project and a safe staging environment/disposable accounts. This blocks catalog, advisors, auth settings, live historical reproduction and allow/deny tests.
2. **High / data:** L04 audience mismatch; L05 partial-media duplicate retry; L06 account-switch draft ownership; L07 migration-history reconciliation. See issue register. Local outbox race fix does not resolve server idempotency.
3. **High / release:** Exact candidate CI, production export, native signed artifacts and real device journey must pass. Local test success does not replace these.
4. **High / privacy and operations:** Real operator/contact/retention facts, privacy and terms review, deletion/access process, moderation ownership, incident response and backup/restore evidence missing.
5. **Medium / coverage:** Route-by-route browser/mobile accessibility, real-user performance and staging load checks remain incomplete.

No production deployment, live customer-data change, migration application, secret rotation or destructive test has occurred.

Candidate update: L04 source mismatch corrected; L05 acknowledged-stage retry and L06 author binding repaired with tests. Their server ambiguity / cross-account enforcement verification remains blocked. Local production web export now PASSES; exact-commit CI/native verification is still required.


## Superseding staging update — 2026-10-14

Supabase access is restored. Catalog/advisor/migration inspection ran read-only. Confirmed Critical excessive writes to spatial_ref_sys; High PostGIS SECURITY DEFINER execute exposure; additional policy/RPC authorization findings need staging reproduction. See STAGING_READINESS.md for evidence and exact boundaries. No existing project is verified staging. User selected the organization for a quote only; get_cost unavailable and provisioning/billing unapproved. Migration replay has nine duplicate prefixes and history drift. These replace the earlier connector-access blocker. No production mutation is authorized by the staging mission.
