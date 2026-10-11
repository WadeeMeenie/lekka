# Lekka product scope

This document records the scope visible in the repository as of the 2026-10-11 audit. It is an implementation-derived baseline, not a claim that every journey is production-ready.

## Core journeys

| Area | Entry points | Acceptance criteria |
|---|---|---|
| Accounts | `/auth`, `/onboarding`, `/reset-password`, account settings | Given a valid account, when the user signs in or restores a session, then the app reaches the intended route without exposing another user’s data. Invalid, expired, and reset-link states show actionable errors. |
| Profiles | `/profile`, `/personal-details`, public profiles, privacy settings | Given an authenticated user, when profile fields are edited, then only that user’s editable fields change and authorization metadata remains server-controlled. |
| Discovery | Nearby tab, local directory, location and radius controls | Given a permitted location, when discovery is requested, then results are radius-scoped, paginated, and show loading, empty, failure, and retry states. Nearby content must not bypass membership or privacy boundaries. |
| Social | Community, post, comments, reactions, saved posts, buddies, messages | Given an authenticated user, when a mutation succeeds or fails, then local state matches the server result and duplicate/retry actions do not create unauthorized or duplicate relationships. |
| Businesses | Business setup, profiles, team, invitations, verification | Given a business role, when a member edits or invites, then the role boundary is enforced server-side and verification cannot be self-promoted. |
| Payments | Business verification and Yoco test checkout | Given a pending verification request, when an authorized manager starts checkout, then the server determines the amount, Yoco receives ZAR, signed events are verified, and duplicate or invalid transitions do not mark an order paid. |

## Explicit non-claims

The repository does not establish legal/privacy/terms readiness, live-payment readiness, backup restoration evidence, device coverage, or production-scale capacity. Those remain release-gate evidence requirements.
