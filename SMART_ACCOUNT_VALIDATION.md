# Smart Account Validation Record

## Automated and database evidence

| Check | Result |
|---|---|
| Supabase migrations | Applied: `smart_accounts`, business post authorization, membership roles, business invitations, and invitation policy scope correction. |
| Privacy boundary | `personal_identities` has RLS with self-only select, insert, and update policies. |
| Business identity boundary | A personal post can omit `business_id`; business-associated posts require the current user to be an owner, admin, or legacy manager of that exact business. |
| Invitation boundary | Invitation reads are scoped either to the invited email or to an owner/admin/manager of the invitation’s exact business. Acceptance verifies the authenticated email matches the invitation. |
| TypeScript | Passed. |
| Lint | Passed with 0 errors and 10 pre-existing warnings. |
| Tests | Passed: 9 files, 33 tests; 1 pre-existing authentication test skipped. |
| Android bundle export | Passed; Android Hermes bundle exported successfully. |

## Manual verification limitations

The Google and Microsoft buttons intentionally show **Setup required** until both providers are configured in Supabase and their developer consoles, and the corresponding public build flags are enabled. No client secret or service-role credential has been added to the mobile application.

No physical Android device, configured outbound mail client, production OAuth provider configuration, or two-account test pair was available. Consequently, native OAuth redirect exchange, device mail composition, invitation acceptance, image-picker recovery after Android activity recreation, and real cross-account RLS attempts remain **NOT TESTED**.

The preview route was not used as evidence: this is a native mobile flow and first-launch onboarding intercepts unauthenticated preview routes. The Android bundle export and deterministic tests are the available non-device validation evidence.
