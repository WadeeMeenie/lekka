
# Lekka Deep-Link Verification Notes

The app configuration declares `scheme: env.scheme`, and the current bundle-id-derived scheme is not `manuslocalradarsa`; it evaluates from `com.app.localradarsa` to `manuslocalradarsa`. Android declares a VIEW intent filter with the same scheme, wildcard host, and BROWSABLE/DEFAULT categories.

The native reset route is `app/reset-password.tsx`. It listens to both `Linking.getInitialURL()` and runtime URL events, requires a recovery URL with `type=recovery`, extracts `access_token` and `refresh_token` from the URL fragment, establishes a Supabase session, and then permits password update.

The Supabase URL Configuration page is reachable for project `vnitwsjidlurlwlpsmtf`, but the first page load did not expose the form contents in extracted text; the redirect allowlist still requires a subsequent visible-field or source inspection to confirm the exact entry.

## Verified live configuration

The Expo configuration derives `manuslocalradarsa` from the unchanged Android package `com.app.localradarsa`, sets it as the app scheme, and uses it in the Android VIEW intent filter with wildcard host plus BROWSABLE and DEFAULT categories.

The live Supabase project currently shows `manuslocalradarsa://reset-password` under Authentication > URL Configuration > Redirect URLs. The Site URL remains `http://localhost:3000`, but the native reset URI is explicitly allowlisted, which is the relevant setting for the APK reset flow because the app passes the native URI as `redirectTo`.
