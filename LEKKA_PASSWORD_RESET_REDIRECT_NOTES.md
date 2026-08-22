# Lekka password-reset redirect notes

Supabase’s official native mobile deep-linking guide: https://supabase.com/docs/guides/auth/native-mobile-deep-linking

Supabase’s official password-authentication guide: https://supabase.com/docs/guides/auth/passwords

Key implementation details from the official documentation: register a custom native URL scheme in the Expo app config; add the corresponding redirect URL to Supabase Auth URL Configuration; pass that redirect URL as `redirectTo` to `resetPasswordForEmail`; and handle the recovery access and refresh tokens delivered in the deep-link URL by calling `supabase.auth.setSession` before allowing `updateUser({ password })`.

Lekka’s current Expo scheme is derived from the Android package `com.app.localradarsa` as `manuslocalradarsa`, so the intended native password-reset redirect is `manuslocalradarsa://reset-password`.
