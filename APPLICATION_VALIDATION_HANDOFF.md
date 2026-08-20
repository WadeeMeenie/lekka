# Lekka — Real Application Validation Handoff

## Current status

The app and database foundation are unchanged. PostGIS, application RLS, spatial indexes, nearby RPCs, radius queries, offline code paths, and the Lekka APK remain available. `public.spatial_ref_sys` is **extension-owned by `supabase_admin`**. Do not attempt further ordinary migrations against it. Its anonymous read remains HTTP 200, and the prior invalid insert proves only a table check constraint, not privilege enforcement. Revisit this through a supported Supabase owner/admin maintenance path.

No seed data was created. No test users were fabricated. No APK rebuild is required unless a code fix is discovered during real testing.

## Temporary Supabase accounts

The project has publishable client credentials only. Email signup is enabled, but `mailer_autoconfirm` is false, so usable accounts cannot be created automatically without confirmed inboxes.

In Supabase Dashboard, open **Authentication → Users → Add user**. Create two temporary users with **Auto Confirm User** enabled for development:

| User | Email | Password |
|---|---|---|
| A | `lekka.test.a@<development-domain>` | Generate a unique temporary password in a password manager. |
| B | `lekka.test.b@<development-domain>` | Generate a different unique temporary password in a password manager. |

Do not put these credentials in source code, `.env` files committed to Git, screenshots, or chat. Delete the users and validation rows after testing.

## A/B application security test

Use separate app sessions or two physical devices. Record each operation as **PASS**, **FAIL**, or **NOT TESTED** only after the Supabase response is observed.

User A signs in, creates a profile, publishes a public nearby post, comments, reacts, and follows User B. User B signs in, creates a profile, reads User A’s public post, comments, reacts, and follows User A.

Using actual authenticated Supabase requests rather than UI visibility, User B then attempts to update or delete User A’s profile, edit or delete User A’s post, update or delete User A’s comment, modify User A’s reaction or saved-post row, and modify User A’s private media. Each unauthorized request must be rejected. Repeat the symmetric profile and post checks from User A against User B’s private data.

For business and community checks, User A owns or is a permitted member of one resource. User B attempts an unauthorized update and delete. The unauthorized requests must be rejected, while the legitimate owner/member operations must succeed.

## Storage test

User A uploads one harmless development image under their permitted user folder, reads it, updates it, and deletes it. User B attempts to read, update, and delete that object. Anonymous access to the private object must be denied. Record the exact HTTP status and Supabase error for each request.

## Physical Android location test

Install the supplied `app-release.apk` on a physical Android device. Grant foreground location only; no background location permission is required.

At Bellville, open Local Radar and record the area label, current-location indicator, radius, RPC result count, and visible nearby content. Move or simulate the device to Stellenbosch, return Lekka to the foreground, and wait for the meaningful-movement refresh. Confirm the location label, radius center, and results change. Repeat at Johannesburg. Confirm Bellville content does not remain dominant when it is outside the new radius.

The app’s foreground watcher is intentionally bounded by a 500-metre movement threshold and a two-minute interval. This is the expected battery-conscious behavior.

## Permission and manual override test

From a fresh install, deny foreground location. Verify that Lekka does not crash, remains usable, and allows **Explore elsewhere → Stellenbosch**. Confirm the UI indicates exploration mode and results use Stellenbosch. Grant permission and choose **Use current location**; verify the device area becomes primary. Revoke permission in Android settings and verify graceful manual fallback.

## Offline and reconnect test

While online, load Home and Local Radar. Disable network, force-close and relaunch, and verify cached content remains. Create a draft, restore network, sign in if required, and verify synchronization creates no duplicate server post. Record the server row ID and repeat refresh once to confirm idempotency.

## Required report fields

| Test | Initial status |
|---|---|
| A/B authentication | NOT TESTED — confirmed accounts unavailable |
| Profile/Post/Comment/Follow/Business RLS | NOT TESTED — requires two real sessions |
| Storage authorization | NOT TESTED — requires authenticated sessions and object operations |
| Current location and movement | NOT TESTED — requires physical Android device |
| Permission fallback | NOT TESTED — requires physical Android device |
| Manual override/return-to-current | NOT TESTED — requires physical Android device |
| Offline/reconnect synchronization | NOT TESTED physically; deterministic offline code tests pass |
| spatial_ref_sys | EXTENSION-OWNED; requires Supabase owner/admin maintenance path |
| Seed data | NOT CREATED by design |
| APK rebuild | NOT REQUIRED unless a code fix is found |
