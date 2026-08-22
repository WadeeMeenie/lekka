# Lekka Test Gap Matrix

**Legend:** `VERIFIED` means evidence exists in the current automated or static checks; `NOT TESTED` means the scenario was not executed; `BLOCKED` means a required prerequisite was unavailable; `PARTIAL` means only some layers are covered.

| Major feature | Automated test | Integration test | Physical device | Two account | Network failure | Offline | Security | Status |
|---|---|---|---|---|---|---|---|---|
| Email signup/login | Auth-flow and timeout tests | Supabase endpoint/config checks | NOT TESTED | NOT APPLICABLE | PARTIAL | NOT APPLICABLE | PARTIAL | PARTIAL |
| OAuth Google/Microsoft | Configuration/classification tests | Provider setup not configured | NOT TESTED | NOT APPLICABLE | NOT TESTED | NOT APPLICABLE | PARTIAL | BROKEN/UNVERIFIED |
| Session restore/logout/expiry | Auth tests | Partial client integration | NOT TESTED | NOT APPLICABLE | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL |
| Onboarding | Onboarding preference tests | Route-level only | NOT TESTED | NOT APPLICABLE | NOT TESTED | PARTIAL | NOT APPLICABLE | PARTIAL |
| Profile editing | Profile validation/settings tests | Repository paths | NOT TESTED | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL |
| Avatar upload/display | Profile/media state tests | Storage helper coverage | NOT TESTED | NOT TESTED | NOT TESTED | PARTIAL | NOT TESTED | PARTIAL |
| Username availability | Normalization, reserved-word, suggestion, cooldown tests | Supabase schema/RLS evidence | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Username history/cooldown | Account-settings/persistence tests | Supabase table/RLS evidence | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Home feed | Loading/pagination/ranking helper tests | Repository/RPC paths | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Local Radar | Local-radar and location helper tests | RPC/schema evidence | NOT TESTED | NOT TESTED | NOT TESTED | PARTIAL | NOT TESTED | PARTIAL |
| Posts | Create/media/outbox tests | Repository paths | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Comments/reactions/saves | Limited repository/helper coverage | Supabase paths | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | UNVERIFIED |
| Follow graph | Limited or absent dedicated coverage | Supabase paths | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | UNVERIFIED |
| Blocking/reporting | Static migration/security tests | No safe end-to-end run | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | UNVERIFIED |
| Notifications | Preference/helper coverage | Notification integration not proven | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | UNVERIFIED |
| Feedback | Feedback validation/repository tests | Table/insert policy evidence | NOT TESTED | NOT TESTED | PARTIAL | NOT TESTED | PARTIAL | PARTIAL |
| Business profiles/invitations | Invitation validation tests | Supabase schema/RLS paths | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL |
| Communities | No complete dedicated suite | Schema vocabulary only | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | UNVERIFIED |
| Messaging | No dedicated suite | No complete integration path | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | MISSING |
| Media security | Static policy tests and upload-state tests | Storage integration path | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | NOT TESTED | UNVERIFIED |
| Offline drafts | Outbox/media tests | Sync paths not fully exercised | NOT TESTED | NOT TESTED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Account switching | No complete dedicated suite | Auth architecture only | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED |
| Accessibility | Labels/state code inspection | No assistive-tech integration test | NOT TESTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | UNVERIFIED |
| Android release | TypeScript/tests/lint; prior APK verification | Previous managed builds | Current audited HEAD NOT TESTED | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Signing/configuration partial | BLOCKED |

## Highest-priority missing evidence

The first validation wave should cover: a fresh APK from the exact GitHub HEAD; real email authentication and session restoration on Android; two-account CRUD and RLS checks; Storage isolation and overwrite/delete checks; Local Radar permission denial and approximate-location behavior; media interruption and retry; notification recipient/deep-link correctness; and offline restart/reconnect/account-switching behavior. These are evidence gaps, not invitations to claim failure where no test was run.
