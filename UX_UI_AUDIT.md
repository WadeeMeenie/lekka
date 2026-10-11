# Lekka UX/UI Audit and Execution Plan

**Baseline:** `main` at `e6fc5868e63a6ab525f0bb3efb5491025021c4e6`  
**Work branch:** `ux/lekka-experience-system-2026-10-11`  
**Scope:** Existing Expo / React Native app. Preserve Supabase, auth, PostGIS, offline drafts, media upload, Yoco, route identities, and existing business logic.

## Audit findings

The repository already has a warm "Karoo Signal" palette and a five-destination information architecture. The work is not a rebuild. The biggest UX risk is that each destination has evolved independently: title sizes and hierarchy vary, discovery and directory headers communicate location differently, touch controls and cards use slightly different geometry, and the design plan contains stale statements about seed-data MVP behavior that no longer describe the integrated Supabase app.

### Screen-level priorities

| Priority | Screen / flow | UX work required | Guardrail |
|---|---|---|---|
| P0 | App-wide shell | One heading hierarchy, predictable spacing, legible navigation labels, consistent selected/pressed states, safe-area behavior | Preserve the five routes and tab destinations |
| P0 | Home feed | Improve scan rhythm, post-card hierarchy, search/filter clarity, loading/empty/offline feedback | Preserve feed pagination, Supabase reads, reactions, saves, report/share, and offline outbox |
| P0 | Radar | Make area and permission status explicit; clarify radius/content filters; explain no-results vs permission denial vs failure | Never imply exact location is public; retain manual-area exploration |
| P0 | Create | Clear type → category → content → audience → publish sequence; visible privacy summary and reliable queued/error states | Preserve image upload and account-scoped drafts; never claim a queued post is published |
| P1 | Local directory | Make search, category selection, location context, results, and listing details feel like one flow | Do not invent listings or claim verification without data |
| P1 | Social | Make Communities / Following / Messages state obvious; distinguish empty, guest, loading, and error states | Do not imply full messaging is available if the route/backend does not support it |
| P1 | Auth, profile, settings, notifications | Audit every entry, recovery, account switch, permission, and destructive action | No false OAuth success; protect account isolation and private profile fields |
| P1 | Detail / forms | Consistent top bars, form validation, keyboard behavior, confirmations, retry and back behavior | Preserve route contracts and server validation |
| P2 | Accessibility and device polish | Dynamic font scale, contrast, screen-reader labels, minimum 44 dp targets, small Android screen and keyboard checks | Verify on an installed Android build; source review is not device QA |

## Design system contract

### Brand

- **Karoo Signal:** warm, grounded, locally useful, confident and friendly.
- **Not:** generic SaaS dashboard, stereotyped South African decoration, excessive gradients, fake glass, clutter, or motion that slows common tasks.
- **Light surfaces:** warm off-white background, white content surfaces, ink foreground, muted green-gray secondary text.
- **Primary:** sunlit amber for key actions and selected states.
- **Secondary:** fynbos green for positive/trust states.
- **Alert / destructive:** coral only when urgency or danger is meaningful.

### Layout and typography

- Mobile-first, portrait, one-handed usage.
- Destination title: approximately 27–28 / 33–34 line-height, bold.
- Supporting copy: 13 / 19; metadata should remain readable and secondary.
- Use 16 dp screen gutters, consistent vertical rhythm, and fewer but more meaningful containers.
- Main touch targets are at least 44 dp; selected chips must be distinguishable by more than color where feasible.
- Cards use restrained borders and spacing, not stacked nested cards.
- Respect safe areas, Android keyboard, font scaling, and dark theme.

### Interaction and state contract

Every network-backed or permission-sensitive flow must be designed for:
1. Initial loading / skeleton.
2. Content.
3. Empty results with a useful next action.
4. Recoverable error with retry and human-readable copy.
5. Offline / queued state where supported.
6. Permission denied or configuration missing.
7. Success confirmation only after the operation actually succeeds.

Optimistic updates must roll back on failure. Do not show fake counters, fake verification, fake providers, fake data, or success after a failed write. Explain privacy and location at the moment the user needs the information.

## Implemented in this UX pass

- Added `LekkaScreenHeading` as a reusable, accessible title / eyebrow / supporting-copy hierarchy.
- Applied it to Create, Social, Local, and Radar while retaining their existing controls and data flows.
- Improved Home feed spacing and post-card content hierarchy.
- Increased primary navigation label legibility and refined the central Create target.

## Remaining implementation and verification

1. Continue auditing and polishing the actual auth, profile, settings, notifications, post detail, community, and listing-detail routes.
2. Standardize empty / error / retry states and remove raw backend error copy from user-facing UI.
3. Check accessibility labels, contrast, touch targets, keyboard overlap, and dark mode on every primary flow.
4. Run TypeScript, lint, interaction audit, production-invariant audit, unit/integration tests, Expo dependency checks, and native Android build on this exact branch.
5. Install the resulting APK on a real Android device and test guest → sign-in → browse → post → react/save → Radar/manual area → Local → Social → settings/account flows.
6. Only merge after CI is green and review confirms no behavior regressions. Device verification must be reported separately from CI.

**Completion rule:** UX/UI is not called complete because the app compiles. Completion requires the implemented screens, state coverage, accessibility review, exact-head CI, and real-device visual/interaction verification.
