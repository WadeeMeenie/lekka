# Staging replay and guard review — 14 October 2026

## Verified repository and CI scope

PR #12 is open, draft, unmerged, targeting main from codex/launch-readiness-20261014. Its inspected head was d1c2f61370ab3d4bad1d94ab800797f6e8c26baa. Exact-commit run: https://github.com/WadeeMeenie/lekka/actions/runs/38534568089. Code/tests/integration job passed, including frozen installation, TypeScript, audits, lint, web export, Expo config/compatibility/doctor. Android was still running when initially inspected. Older ef86720 results are not used as proof for d1c2f61.

Local HEAD remains ef86720; prior published d1c2f61 files are present as working-tree edits/untracked files because shell fetch was unavailable. Existing edits were preserved. This review changes only the guard, its caller/tests, replay audit and documentation, using d1c2f61 as the remote parent. No reset or blanket overwrite of developer work.

## Account-specific quote: BLOCKED

Retried get_cost with the user-selected organization ezuqyiivnqdvrfsadntr and type project. It returned UNAVAILABLE: “MCP tool get_cost was not returned by tools/list”. The tool has no region parameter. No account-specific quote or cost approval exists for lekka-staging / eu-west-1. No provisioning, plan change, project pause or charge was initiated.

Dashboard steps (review only):
1. Open https://supabase.com/dashboard and select **WadeeMeenie's Org**, checking organization ID ezuqyiivnqdvrfsadntr.
2. Open organization **Billing → Subscription Plan → Change subscription plan**. Review the cost presentation for a plan that permits another active project; stop before confirming any subscription change. Upgrades apply organization-wide and immediately.
3. Return to the organization's projects and open **New project**. Select the same organization, proposed name **lekka-staging**, region **West EU (Ireland) / eu-west-1**, minimum suitable compute, and no paid add-ons. Do not click Create project. If the free-project limit prevents reaching the configuration/quote, stop there; obtain an itemized quote through Supabase billing/support instead of upgrading to reveal it.
4. Record currency, recurring subscription, staging compute, effects on existing projects, taxes, one-off charges, add-ons, spend-cap/overage terms and configuration. Share only those details, not passwords or payment information.
5. Approve that exact quote/configuration separately before creation. A generic price list is not approval and is not an account quote.

The connector previously verified a Free organization with two active projects and one inactive unrelated project. Official guidance confirms organization-wide billing and the free-project limit: https://supabase.com/docs/guides/platform/billing-on-supabase . Billing navigation/cost presentation: https://supabase.com/docs/guides/platform/manage-your-subscription . Dashboard steps are based on official documentation, not a claim that the account's live billing screen was opened.

## Migration comparison: read-only evidence

Read all 84 repository SQL files and all 88 production migration records, including their statements. Comparison normalizes CRLF to LF and trims outer whitespace only. Comments, internal whitespace and actual SQL differences remain significant. Exact text equality establishes matching recorded text, not successful effects or semantic equivalence.

- 32 local files match a recorded migration's SQL text exactly.
- 35 match a recorded name but differ in SQL text.
- 3 match a version only and differ in SQL text.
- 14 have no exact name/version/content match.
- 18 live records have no candidate by those exact criteria. Some may be renamed/split equivalents, not necessarily missing functionality.
- Nine duplicate local version prefixes remain. Only 11 local files match a live version ID.
- Production history was not edited, repaired or marked applied. No replay was attempted.

The companion migration-replay-matrix.json lists every local file and all 88 recorded IDs, including candidate matches and unmatched records. Raw migration SQL was processed for comparison without printing or exporting potentially sensitive literals.

### Concrete dependency and drift findings

1. Duplicate prefixes: 202608230001 (4 files), 202608230002 (3), 202608230003 (2), 202608230005 (2), 202608230006 (2), 202608230007 (3), 202608230008 (2), 202608240001 (2), 202608270001 (2). Lexical ordering cannot resolve intended dependency order.
2. 202608230001_social_community_messaging_controls alters community/message structures whose foundational direct-message migration is named 202608230002_social_messaging_community_following. Resolve table creation before dependent policy/column operations; do not trust filename order.
3. 202608230005_profile_privacy refers to public.buddies. Live SELECT to_regclass confirms buddies is absent while buddy_requests exists. It also overlaps 202608230005_private_profiles and redefines profile helper signatures. Choose one reviewed buddy_requests-based model; reconcile parameter names/return types before replacement. Do not replay both blindly.
4. Three files contain the production project reference in cleanup routing: 20260905160000_media_lifecycle_cleanup, 20260905171500_secure_media_cleanup_invocation, 20260905172000_fix_media_cleanup_cron_routing. Quarantine scheduling and production-bound configuration. The audit now reports these filenames and refuses replay readiness without printing literals.
5. Production includes service/cron fixes, signup-trigger repair, Yoco corrections and Cape Aloe resources without direct exact-name/version/content candidates. Cape Aloe belongs to a separate application scope; exclude it from a Lekka-only baseline unless an explicit dependency is demonstrated.
6. The 20261011 helper/avatar/community and identity repairs exist locally under different timestamps (20261011210000 and 20261011211500), illustrating why an ID mismatch alone is not “missing migration”.
7. Recorded PostGIS hardening does not match effective authorization: read-only checks again return anon/authenticated UPDATE=true for spatial_ref_sys, with RLS=false. Existing owner is supabase_admin while connected SQL role is postgres. Repeated history entries do not prove effective revocation. Exact cause of grant drift remains unproven.
8. Existing live SECURITY DEFINER nearby RPC definitions omit block/private-profile checks present in direct post-read policy, and multiple permissive post-insert policies combine with OR. Preserve these as known defects to reproduce, not as desired staging defaults.
9. A main branch status of MIGRATIONS_FAILED is known; its original error log was not retrieved. Duplicate prefixes are a replay blocker, not a proven explanation for that historical status.

### Staging-only replay plan (proposed, not executed)

| Stage | Input and ordering | Exit evidence |
|---|---|---|
| 0 — authorization | Approved quoted empty project; verify ref differs from production; approved synthetic email/secret storage | Management identity + runner guards |
| 1 — reconcile sources | Use matrix to select canonical definitions; review every differing/unmapped entry; keep original migration files intact; assign unique IDs only to a separate staging baseline after CLI discovery | Signed-off mapping, exact source hashes and ordered manifest |
| 2 — primitives | Extension/private schemas, enums, profiles, communities/businesses, then posts and dependent media/comments/reactions; use platform-provided Auth/Storage schemas | Object/constraint/extension inventory |
| 3 — social dependencies | buddy_requests, membership, conversations before messages; profile helper signature consolidation; indexes/FKs; signup trigger after profile schema | Fresh schema replay with stop-on-error |
| 4 — authorization | Final grants, policy helpers, RLS, guarded RPCs and triggers; private bucket policies; no broad interim public grants | Catalog assertions plus allow/deny fixture tests |
| 5 — service jobs | Review cleanup queue/functions without schedules first; inject only staging URL/credentials; sandbox external services and disable real payment/email side effects | No production references/outbound jobs; staged job authorization tests |
| 6 — known defects | Separately reviewed staging fixes for S01–S06; retain pre-fix regression evidence | Negative tests fail before fixes and pass after |
| 7 — repeatability | Rebuild a second empty isolated database from the same manifest; compare catalog and grants | Deterministic replay and full test matrix |

No executable replay package is approved yet. Do not copy Auth users or rows/media, run db reset/push against production, rename production history, or apply all files alphabetically. A schema-only baseline must exclude data-bearing INSERTs, secrets, cron scheduling and environment-specific endpoints. Stage creation/approval and unresolved SQL dependencies prevent a trustworthy full replay test now.

## Guard review and verification

Three new regressions failed before fixes and pass after:
- Invalid target reference accepted by cleanup-manifest validation: target is now validated through the strict production-denying URL/ref guard.
- Upper/lowercase variants of one UUID bypassed manifest duplicate detection: UUIDs are now compared in lowercase.
- A staging project reference without APP_ENV=staging could leave frontend production configuration active: this inconsistent environment now throws before client creation.

Full local suite: **168 PASS / 2 SKIPPED**, 33 files. TypeScript, changed-file ESLint and diff checks PASS. Local Vitest uses the documented programmatic runner due the Windows config-bundler restriction. Replay safety audit returns failure on nine duplicate prefixes and three production references; that is a safety check detecting blockers, not a successful migration replay.

Remaining limitations: guard validation cannot establish ownership/approval of an arbitrary non-production project; matching environment values alone are insufficient authorization. If every staging signal is omitted, the normal frontend still acts as a normal build; the dedicated runner requires explicit staging mode. There is no executable destructive cleanup/seed routine. A future cleanup must verify server-side run ownership for each manifest UUID before deletion; a syntactically valid manifest is not permission to delete existing accounts. Preflight uses a dedicated publishable key, redirect=error and sanitized errors; reachability does not prove schema or authorization. Live staging tests remain BLOCKED.

## Security test and remediation proposals

| Finding | Severity / evidence | Isolated test and proposed fix |
|---|---|---|
| S01 spatial metadata writes | Critical; effective anon/auth UPDATE true, RLS off | Staging snapshot of reference row; owner-approved revoke client mutation grants, preserve needed reads, assert all mutation privileges false; attempt denied insert/update/delete in staging and verify catalog unchanged. Extension-owner assistance may be required. |
| S02 estimated extent RPCs | High; three privileged overloads executable by clients | Test all signatures as anon/member; revoke inappropriate PUBLIC/client execute with owner privileges and assert effective grants. No production privilege change. |
| S03 post INSERT policy OR | High, live definition evidence; no attack executed | Member A attempts forged business ID and private-community ID; verify row absent. Allowed business manager/member inserts must succeed. Consolidate ownership AND business AND community checks rather than separate permissive alternatives. |
| S04 nearby privacy/radius | High, live definition evidence | Owner/private/buddy/blocked/outsider fixtures; compare direct SELECT, both feed RPCs and detail RPC. Enforce consistent block/profile/community predicates and bounded radius; test pagination and boundaries. |
| S05 bucket limits | Medium; private bucket has no MIME/size limits | Valid image succeeds, oversized/disallowed content rejected, cross-user read/update/delete denied. Configure reviewed limits and validate file content as appropriate. |
| S06 leaked passwords | Medium, disabled with Free-plan dependency | With approved staging Auth configuration, exercise compromised/strong-password signup and confirmation. Choose supported plan/protection without silently changing production. |
| S07 production cron routing in replay | High staging-isolation hazard; three source files | Audit must reject production references; inspect staged cron/config before enabling jobs. Replace environment binding in separate staging baseline; verify all outbound destinations. |

Security findings remain open until isolated execution verifies fixes. Related Supabase guidance: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public and https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .

## Local-to-live mapping

CONTENT_MATCH is text equality; all other rows require review. Candidate IDs are exact version/name/content associations, not asserted equivalence.

| Repository migration | Comparison | Candidate live IDs |
|---|---|---|
| 202608200001_local_radar_core.sql | CONTENT_MATCH | 20260820221720 |
| 202608200002_location_first_engine.sql | CONTENT_MATCH | 20260820222122 |
| 202608200003_local_entities.sql | CONTENT_MATCH | 20260820222441 |
| 202608200004_restrict_spatial_ref_sys.sql | CONTENT_MATCH | 20260820224758 |
| 202608200005_spatial_ref_sys_rls_guard.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608210001_social_core.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608210002_social_core_lockdown.sql | NAME_ONLY_CONTENT_DIFFERS | 20260821052722 |
| 202608210003_feed_cursor_pagination.sql | NAME_ONLY_CONTENT_DIFFERS | 20260821054912 |
| 202608210004_moderation_blocks.sql | NAME_ONLY_CONTENT_DIFFERS | 20260821054710 |
| 202608210005_beta_feedback.sql | CONTENT_MATCH | 20260821144153 |
| 202608210006_smart_accounts.sql | CONTENT_MATCH | 20260821145423 |
| 202608210007_business_post_authorization.sql | CONTENT_MATCH | 20260821150308 |
| 202608210008_business_membership_roles.sql | CONTENT_MATCH | 20260821150744 |
| 202608210009_business_invitations.sql | NAME_ONLY_CONTENT_DIFFERS | 20260821151326 |
| 202608210010_business_invitation_policy_scope.sql | CONTENT_MATCH | 20260821151619 |
| 202608220001_profile_insert_policy.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608220003_community_moderation_policies.sql | NAME_ONLY_CONTENT_DIFFERS | 20260822193111 |
| 202608220004_community_moderation_content.sql | NAME_ONLY_CONTENT_DIFFERS | 20260822193751 |
| 202608220005_community_owner_read.sql | NAME_ONLY_CONTENT_DIFFERS | 20260822193924 |
| 202608220006_community_reports_branding.sql | NAME_ONLY_CONTENT_DIFFERS | 20260822194809 |
| 202608220007_feed_preferences_buddies.sql | NAME_ONLY_CONTENT_DIFFERS | 20260822201112 |
| 202608230001_atomic_social_interactions.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230001_facebook_style_reactions.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823164337 |
| 202608230001_social_community_messaging_controls.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823202113 |
| 202608230001_yoco_test_payments.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230002_lockdown_yoco_rpc_grants.sql | CONTENT_MATCH | 20260823210122 |
| 202608230002_remove_ambiguous_pinned_profile_relation.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823202142 |
| 202608230002_social_messaging_community_following.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823170732 |
| 202608230003_direct_message_request_rls.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823202355 |
| 202608230003_social_hardening.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823171037 |
| 202608230004_community_pin_controls.sql | CONTENT_MATCH | 20260823202544 |
| 202608230005_private_profiles.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230005_profile_privacy.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230006_fix_community_rls_recursion.sql | NAME_ONLY_CONTENT_DIFFERS | 20260906064359 |
| 202608230006_stabilize_business_social_security_and_indexes.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230007_business_verification_foundation.sql | NAME_ONLY_CONTENT_DIFFERS | 20260823205303 |
| 202608230007_delete_own_posts.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608230007_enforce_message_request_realtime_integrity.sql | CONTENT_MATCH | 20260823203254 |
| 202608230008_business_verification_indexes.sql | CONTENT_MATCH | 20260823205355 |
| 202608230008_lock_down_public_security_definer_helpers.sql | CONTENT_MATCH | 20260823203558 |
| 202608230021_yoco_webhook_subscriptions.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202608240001_allow_yoco_refunded_payment_status.sql | CONTENT_MATCH | 20260824113314 |
| 202608240001_yoco_payment_status_rpc_fix.sql | CONTENT_MATCH | 20260824113738 |
| 202608270001_enable_post_media_realtime.sql | NAME_ONLY_CONTENT_DIFFERS | 20260827155031 |
| 202608270001_fix_community_post_area.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 202609030001_unified_discovery_engine.sql | NAME_ONLY_CONTENT_DIFFERS | 20260903212539 |
| 20260903220852_add_delete_own_post_function.sql | CONTENT_MATCH | 20260903220852 |
| 20260904052759_allow_authenticated_users_to_delete_own_posts.sql | NAME_ONLY_CONTENT_DIFFERS | 20260904052759 |
| 20260905132923_community_security_hardening.sql | CONTENT_MATCH | 20260905132923 |
| 20260905150000_media_access_hardening.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905134606 |
| 20260905160000_media_lifecycle_cleanup.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 20260905171500_secure_media_cleanup_invocation.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905150949 |
| 20260905172000_fix_media_cleanup_cron_routing.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 20260905173000_lock_down_client_rpc_execute_privileges.sql | CONTENT_MATCH | 20260905152832 |
| 20260905180000_business_logo_media_lifecycle.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905160929 |
| 20260905181000_harden_direct_message_updates.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905171750 |
| 20260905182000_protect_profile_role.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905171952, 20260905172002 |
| 20260905183000_harden_business_security_definers.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905174405 |
| 20260905190000_cross_account_business_community_storage_hardening.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905180404 |
| 20260905200000_tighten_sensitive_table_grants.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905182953 |
| 20260905210000_location_scoped_post_reads.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905200453 |
| 20260905211000_nearby_post_detail_rpc.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905200508 |
| 20260906001500_nearby_media_authorization.sql | NAME_ONLY_CONTENT_DIFFERS | 20260905221512 |
| 20260906070000_revoke_public_postgis_extent_execute.sql | CONTENT_MATCH | 20260906064243 |
| 20260906071000_fix_community_rls_recursion.sql | CONTENT_MATCH | 20260906064359 |
| 20260921230000_production_hardening.sql | CONTENT_MATCH | 20260921211319 |
| 20260921232000_profile_rpc_fields.sql | CONTENT_MATCH | 20260921211338 |
| 20260921234000_platform_admin_self_scope.sql | CONTENT_MATCH | 20260921211452 |
| 20260921235000_lock_down_radar_rpc.sql | CONTENT_MATCH | 20260921211556 |
| 20260921241000_platform_admin_compatibility.sql | CONTENT_MATCH | 20260921212939 |
| 20260924073018_harden_security_definer_helper_execute.sql | CONTENT_MATCH | 20260924073018 |
| 20260924073115_bound_discovery_radius_and_result_limit.sql | CONTENT_MATCH | 20260924073115 |
| 20260924110000_harden_yoco_payment_transitions.sql | NAME_ONLY_CONTENT_DIFFERS | 20260924050859 |
| 20260924200000_revoke_excessive_client_table_privileges.sql | CONTENT_MATCH | 20260924044806 |
| 20260924200500_harden_public_default_client_privileges.sql | CONTENT_MATCH | 20260924044945 |
| 20261011082007_restrict_postgis_metadata_client_access.sql | NAME_ONLY_CONTENT_DIFFERS | 20261011082007 |
| 20261011083000_verify_postgis_metadata_client_access.sql | NO_EXACT_NAME_VERSION_OR_CONTENT_MATCH | none |
| 20261011114123_index_posts_community_pinned_by_20261011.sql | NAME_ONLY_CONTENT_DIFFERS | 20261011114123 |
| 20261011114344_toggle_block_atomic_20261011.sql | NAME_ONLY_CONTENT_DIFFERS | 20261011114344 |
| 20261011114429_toggle_post_like_atomic.sql | VERSION_ONLY_CONTENT_DIFFERS | 20261011114429 |
| 20261011192054_verify_yoco_payment_amount_currency.sql | VERSION_ONLY_CONTENT_DIFFERS | 20261011192054 |
| 20261011192351_lock_down_yoco_order_creation.sql | VERSION_ONLY_CONTENT_DIFFERS | 20261011192351 |
| 20261011210000_restore_policy_helpers_and_profile_avatar.sql | CONTENT_MATCH | 20261011213242 |
| 20261011211500_save_personal_identity_rpc.sql | CONTENT_MATCH | 20261011213541 |

