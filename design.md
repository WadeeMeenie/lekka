# Lekka — Product UX and Interface System

## Product direction

Lekka is a portrait-first, one-handed South African social and local-discovery app built around the question: **“What matters around me right now?”** It combines a nearby social feed, Local Radar, lightweight posting, community discovery, and a useful local directory.

The experience should feel premium, practical, friendly, and confidently local without leaning on stereotypes. It should not resemble a generic SaaS dashboard or copy another social platform's visual identity.

The application is an existing Expo / React Native app backed by Supabase and PostGIS. UX changes must preserve the live data model, authentication, RLS boundaries, account-scoped offline drafts, media upload flow, route identities, and Yoco integration. Never replace a live integration with seed data or simulate a success state.

## Primary navigation

The five destinations remain:

1. **Home** — nearby feed, search, notifications, reactions, saves, sharing, reporting, and offline draft status.
2. **Radar** — nearby discovery with radius and content filters, location permission state, and manual South African area exploration.
3. **Create** — post type, category, content/media, audience, privacy summary, publish and queued-draft feedback.
4. **Social** — communities, followed communities, and the current messaging entry point.
5. **Local** — nearby businesses, deals, events, marketplace, jobs, and services.

Do not rename route files or change route contracts solely for visual consistency.

## Brand: Karoo Signal

- **Background:** `#F7F8F5` light / `#111816` dark.
- **Surface:** `#FFFFFF` light / `#1B2421` dark.
- **Foreground:** `#10211D` light / `#F4F7F2` dark.
- **Muted text:** `#63736D` light / `#A5B4AD` dark.
- **Primary amber:** `#E9A23B` light / `#F2B451` dark.
- **Fynbos green:** `#2F7D67` light / `#65B59B` dark.
- **Alert coral:** `#D95D4F` light / `#F17C6D` dark.
- **Border:** `#DDE5DF` light / `#33433D` dark.

Amber is the main action/selection color; green is for positive and trust states; coral is reserved for urgent alerts and destructive actions. Avoid using color as the only signal.

## Layout and type

- Keep primary actions reachable with one hand.
- Use 16 dp screen gutters, a consistent spacing rhythm, clear hierarchy, and intentional whitespace.
- Destination headings use a shared 27–28 dp bold title, a compact uppercase eyebrow when useful, and 13 dp supporting text.
- Body text should be comfortable to read; metadata is secondary but not tiny.
- Use restrained card borders, modest corner radii, and imagery only when it adds context.
- All controls should have clear pressed, selected, disabled, and busy states; primary touch targets should be at least 44 dp.
- Respect safe areas, keyboard behavior, dark mode, screen-reader labels, and user font scaling.

## Core flows

### Discover nearby

Home shows the active area and nearby content. Users can filter the feed or open Radar to change the radius and content type. Radar supports current approximate location and manual area exploration without forcing device-location permission. A result should make its category, area, distance context, and next action clear.

### Publish

Create follows the order: type → category → content/media → audience → privacy summary → publish. Validation should appear beside the relevant action. An offline draft must be labelled as queued, not published; success is shown only when the backend write succeeds. Media failures must offer an appropriate retry.

### Privacy and account

Explain location visibility before publishing or granting location access. Provide explicit guest/authenticated states. Never expose exact coordinates in public-facing copy, leak account-scoped drafts across accounts, or claim unavailable OAuth providers are working.

## Required states for async flows

Design and test each applicable state: loading, content, empty, recoverable error with retry, offline/queued, permission denied, configuration unavailable, and success after confirmed completion. Prefer plain-language recovery guidance over raw backend messages. Roll back optimistic state when a write fails.

## UX/UI delivery gate

A screen is not considered finished solely because it looks attractive or compiles. The completion criteria are:
- Existing features and data contracts are preserved.
- Visual hierarchy, spacing, navigation, and interaction behavior are consistent.
- Accessibility labels, contrast, target sizes, and keyboard/safe-area behavior are checked.
- Loading, empty, error, permission, offline, and success states are covered.
- TypeScript, lint, interaction and production-invariant audits, tests, Expo compatibility checks, and native Android build pass on the exact candidate commit.
- The installed APK is exercised on a real Android device; CI success is not a substitute for device QA.

See [UX_UI_AUDIT.md](./UX_UI_AUDIT.md) for screen-level findings, implementation status, and the remaining acceptance plan.
