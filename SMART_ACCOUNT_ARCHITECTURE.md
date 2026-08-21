# Lekka Smart Account Architecture

Lekka continues to use one Supabase Auth identity per person. A user may keep a personal profile and own or manage one or more business profiles through `business_members`; a business account is therefore not a second login. The active identity is a local UI preference, rather than an authorization credential.

| Concern | Design |
|---|---|
| Personal identity | `personal_identities` is a one-to-one, self-only table for first name, surname, date of birth, and optional gender. |
| Public profile | `profiles` retains only the existing public profile fields. `account_intent` records whether onboarding was completed as personal or business. |
| Business ownership | `businesses.owner_id` remains the primary owner; an owner membership is created atomically by the business-creation RPC. `admin` and `staff` are now recognized role values; legacy `manager` and `member` records remain compatible. |
| Business editing | The owner or a future manager may update a business through a secure RPC. No ordinary user can alter another business. |
| Account switching | The app stores `personal` or a selected `businessId` locally. It does not grant permissions; every backend write is still enforced by Supabase RLS and RPC membership checks. |
| OAuth | Google and Microsoft use Supabase OAuth with the Android deep-link redirect created by Expo. Provider buttons remain configuration-required until their non-secret public enable flags are turned on after dashboard setup. |

The onboarding order is account intent, location, interests/theme, authentication, then the relevant personal or business setup. Guests continue to browse and are only asked to authenticate when they choose to complete an account.

## Required provider configuration

Google and Microsoft (Azure) must be configured in the Supabase Auth provider dashboard with their provider-side client credentials. The Android app stores neither client secrets nor service-role keys. After both the Supabase provider and the mobile redirect URL are configured, set the corresponding public build flag to `true`:

```text
EXPO_PUBLIC_LEKKA_GOOGLE_OAUTH_ENABLED=true
EXPO_PUBLIC_LEKKA_MICROSOFT_OAUTH_ENABLED=true
```

Register the app's generated redirect URL, `manuslocalradarsa://auth`, in Supabase Auth URL configuration and in each provider's redirect allowlist. The app exchanges only the returned authorization code for a Supabase session.
