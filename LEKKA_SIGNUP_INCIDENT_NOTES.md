
## Live Supabase evidence (2026-08-22)

Project: `vnitwsjidlurlwlpsmtf` (`local-radar-sa`), host `vnitwsjidlurlwlpsmtf.supabase.co`.

GET `/auth/v1/settings` with the configured publishable key returned HTTP 200. The response reports email auth enabled; Google and Azure are disabled.

A deliberately invalid POST to `/auth/v1/signup` returned HTTP 422 with `weak_password`, proving the endpoint is reachable from the sandbox.

Recent Auth logs showed a successful `/signup` HTTP 200 and `mail.send` event at 2026-08-22T11:56:19Z, followed by `/verify` HTTP 303 at 11:56:39Z. The focused Auth log query for 12:35–12:41Z returned no Auth records. The edge log in that interval showed the Samsung device/network reaching Supabase Realtime websocket successfully with HTTP 101 from Cell C in Western Cape, but this record was not a sign-up request.

The live public schema contains `public.profiles` with required `id` referencing `auth.users`, `display_name` default '', and `account_intent` default 'personal'. The repository migration defines `public.handle_new_user()` to insert `(id, display_name, username)` after auth user creation. The app bundle contains the configured Supabase host and `auth/v1`, so it is not an empty-backend release.

Interpretation so far: OAuth dialogs are expected configuration-required states because Google/Azure are disabled. Email sign-up is available server-side and has succeeded previously, but the reported failure was not accompanied by an Auth `/signup` log in the focused interval; additional app-side observability and a more precise network-vs-server error path are needed before changing backend schema or provider settings.
