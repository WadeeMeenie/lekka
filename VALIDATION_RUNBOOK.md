# Lekka — Final Pre-Seed Validation Runbook

This runbook prepares real validation without manufacturing PASS results. Any test not performed on a physical Android device or with two confirmed Supabase users must remain **NOT TESTED**.

## Current blockers and account setup

The remote Supabase project accepts the publishable client configuration and email signup is enabled, but `mailer_autoconfirm` is `false`. No service-role credential is available or required in the app. Therefore, two usable accounts were **not created automatically**: they require confirmed email addresses.

Create two temporary accounts in Supabase Dashboard under **Authentication → Users → Add user**, with **Auto Confirm User** enabled for development:

| Account | Suggested email | Password handling |
|---|---|---|
| User A | `lekka.test.a@<your-development-domain>` | Generate a unique temporary password in a password manager; do not commit it. |
| User B | `lekka.test.b@<your-development-domain>` | Generate a different unique temporary password in a password manager; do not commit it. |

If accounts are created through the app instead, use the same addresses, complete the confirmation email, then sign in separately on the test device. Delete both users and all test rows after validation.

## A/B authorization procedure

Use two separate app sessions or two devices. Record every operation as PASS, FAIL, or NOT TESTED.

| Step | User A | User B | Expected result |
|---|---|---|---|
| 1 | Sign in and create a profile. | Sign in and create a profile. | Each user can update their own profile. |
| 2 | Create a public nearby post. | Read User A’s post. | Public read succeeds when the post is visible to the selected area. |
| 3 | Add a comment to User A’s post. | Add a comment to User A’s post. | Both comments are visible to permitted readers. |
| 4 | React to User B’s visible post. | React to User A’s visible post. | Each user can create or remove only their own reaction. |
| 5 | Follow User B. | Follow User A. | Each follow row is owned by its creator. |
| 6 | Attempt to edit User B’s profile using a direct client request. | Attempt to edit User A’s profile using a direct client request. | Both attempts must be rejected. |
| 7 | Attempt to edit or delete User B’s post. | Attempt to edit or delete User A’s post. | Both attempts must be rejected. |
| 8 | Attempt to modify User B’s comment. | Attempt to modify User A’s comment. | Both attempts must be rejected. |
| 9 | Attempt to write a saved-post or business-membership row for another user/business. | Repeat for the opposite account. | Writes must be rejected unless the policy grants the specific ownership role. |

Do not call a test PASS merely because the UI hides an action. Verify the authorization response from Supabase, ideally with the Network inspector or a small authenticated client test using the same session.

## Storage security procedure

The `local-radar-media` bucket is private and has authenticated read, user-folder upload/update/delete policies. With User A signed in, upload one harmless development image under `user-a/<user-a-id>/validation.png`, read it, update it, and delete it. Record PASS only if all operations succeed.

With User B signed in, attempt to read, update, and delete User A’s object. Record PASS only when access is denied. Repeat with an object under a business path only after User B has been deliberately granted the relevant business-member role. Anonymous access must be tested without an authenticated session and must be denied for private objects.

## Android current-location procedure

Install the supplied `app-release.apk` on a physical Android device. Do not grant background location; Lekka requires foreground location only. Enable Android Location Services and grant the foreground location permission when prompted.

At **Bellville**, open Lekka, open Local Radar, and record the visible area label, the current-location indicator, the selected radius, and the nearby results. Change the radius once and confirm the result count changes or remains empty without inventing content.

Move or use Android’s device-location simulation to set **Stellenbosch**, return Lekka to the foreground, and wait for the meaningful-movement refresh. Confirm that the area label, RPC inputs, and nearby results change. Repeat at **Johannesburg**. Confirm that Bellville content does not remain dominant when the new location and radius do not include it.

The foreground watcher is intentionally bounded by a 500-metre movement threshold and a two-minute interval. This is designed to avoid continuous high-accuracy polling and excessive database requests.

## Permission, manual override, and return-to-current procedure

For permission denial, start from a fresh install, deny foreground location, open Local Radar, and confirm that the app remains usable. Use **Explore elsewhere** to select Stellenbosch and confirm the UI indicates the temporary exploration area. Select **Use current location** after granting permission and confirm that the current device area becomes primary again. Revoke permission in Android settings, reopen the screen, and confirm graceful fallback without a crash.

## Offline and reconnect procedure

While online, open Home and Local Radar and wait for backend content or an explicit empty state. Disable network, force-close and relaunch Lekka, and confirm cached content remains available. Create a local post draft while offline. Restore network, sign in if required, and verify that synchronization creates at most one server post. Record the resulting server row ID and confirm a second refresh does not duplicate it.

## spatial_ref_sys analysis

Read-only analysis found that anonymous PostgREST access to `public.spatial_ref_sys?select=*&limit=1` returns HTTP 200 and exposes only the standard PostGIS CRS metadata columns: `srid`, `auth_name`, `auth_srid`, `srtext`, and `proj4text`. The sample row contained EPSG CRS metadata, not Lekka users, posts, businesses, or location history.

However, role grants currently include `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` for both `anon` and `authenticated`. No write was attempted because doing so would mutate a PostGIS system table. The application’s nearby RPCs execute successfully without requiring the table through the public API, and Lekka data is stored in separate tables with application RLS.

Recommendation: **B — restrict anonymous and authenticated PostgREST table access while preserving PostGIS functionality.** Do not enable RLS blindly. Prefer revoking direct table privileges from `anon` and `authenticated` while retaining owner/service-role/database-function access, then re-run the nearby RPC and `ST_DWithin` smoke tests. Apply this only after reviewing the project’s PostGIS extension ownership and migration workflow.

Candidate SQL for an explicitly approved maintenance window is:

```sql
revoke all on table public.spatial_ref_sys from anon, authenticated;
```

Do not run this candidate SQL as part of the current validation-preparation step.

## Current result status

| Area | Status |
|---|---|
| Supabase endpoint and publishable-key connectivity | PASS |
| Application-table RLS inventory | PASS for configured policies; A/B behavior NOT TESTED |
| Storage bucket and policy inventory | PASS; upload/read/write behavior NOT TESTED |
| PostGIS and spatial RPC smoke tests | PASS |
| spatial_ref_sys direct anonymous read exposure | CONFIRMED; remediation NOT APPLIED |
| Physical current-location movement | NOT TESTED |
| Permission denial and recovery | NOT TESTED |
| Manual override and return-to-current on device | NOT TESTED |
| Offline cache and deterministic project tests | PASS at code/test level; physical reconnect synchronization NOT TESTED |
| Development seed data | NOT CREATED by design |
| APK installation and launch on device | NOT TESTED |
