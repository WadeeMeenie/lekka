# Lekka Category-Specific UX/UI Specification

**Status:** Research-backed product specification. Research date: 14 October 2026.

**Non-negotiable rule:** Each category is a different user task. Reuse the design system and shared controls, but do not render every object as a generic social post with a category label.

## Research findings

- **Marketplace:** Buyers need clear product photos, price, condition, location, seller identity and a direct way to ask about the item. Listings need persisted lifecycle states such as Available, Reserved and Sold. A sold item must stop looking purchasable and must disappear from default available results. Sold is an explicit owner action, not an inferred client-only label.
- **Businesses:** Google Business Profile emphasizes category, accurate hours, location or service area, contact details, photos, services/products, updates and customer reviews. Make a local storefront, not a post: show the next action—Call, Message, Directions, Book, Website, Menu or Services—only when configured and functional.
- **Deals:** Show a concrete benefit, merchant, offer price/saving when supplied, start/end dates, redemption method and terms. Expired offers must say Expired and leave active-offer results.
- **Events:** Eventbrite's creation flow highlights image, title, summary, date/time, location or online venue, event details, ticket types and organizer. Cards lead with when/where and free/ticket price. Details show schedule, venue/map, organizer and entry/ticket instructions.
- **Jobs:** LinkedIn separates job title, job details, description and application settings. Cards need title, employer, location/work mode, employment type and salary only if supplied. Details show responsibilities, requirements, closing date and a real application method.
- **Services:** Google Business Profile supports grouped services with descriptions and prices. Show provider, service area, price model and price when supplied. Use Request a quote, Message, Call or Book only when that action is actually implemented.
- **Communities:** Reddit's community and flair patterns show the value of clear purpose, rules, membership context and post types. Community details need About/Rules, feed, membership state, and moderation actions gated by permissions.
- **Local alerts:** Alerts are time-sensitive utility, not evergreen posts. Show alert type/severity, affected area, posted/updated time, expiry and resolved state where available. Do not invent verification badges.
- **General posts:** Keep the lightweight social format for discussion, questions, updates and media. Do not show commerce, opening-hour, job or event fields unless the post links to a real typed object.

## Primary research sources

- Google Business Profile: https://business.google.com/en-all/business-profile/
- Google business photos guidance: https://support.google.com/business/answer/6103862?hl=en
- Google service editor: https://support.google.com/business/answer/9455399?hl=en-11
- Google updates, offers and events: https://support.google.com/business/answer/7342169?hl=en
- Airbnb listing presentation—photos, description, amenities and pricing: https://www.airbnb.com/resources/hosting-homes/a/help-a-hosts-listing-stand-out-633
- Airbnb effective listing page: https://www.airbnb.com/resources/hosting-homes/a/how-to-set-up-an-effective-listing-page-12
- LinkedIn job posting and application settings: https://www.linkedin.com/help/linkedin/answer/a6542541
- Eventbrite event details and tickets: https://www.eventbrite.com/help/en-us/articles/193464/
- Reddit post flair: https://support.reddithelp.com/hc/en-us/articles/15484545678996
- Reddit community settings and guides: https://support.reddithelp.com/hc/en-us/articles/15484546290068

## Category UX contract

| Category | Result card | Detail page | Main action | Owner lifecycle |
|---|---|---|---|---|
| Marketplace | Photo, title, **price in ZAR**, condition, area, seller, Available/Reserved/Sold | Gallery, price, condition, description, item specifics, safe collection/delivery notes, seller, report action | Message seller / Ask about item | Edit, mark sold, mark available/relist, delete |
| Business | Logo/cover, name, category, area, open/closed/unknown only from saved hours, value proposition | Photos, hours, public address or service area, contact, services/products, deals/events, genuine reviews | Call, Message, Directions, Book, Website—configured actions only | Edit profile/hours/services, publish update/offer/event |
| Deal | Offer title, merchant, benefit, price/saving if known, expiry, area | Terms, dates, redemption steps/code, restrictions, merchant profile | Redeem / View offer / Message merchant | Edit, pause, expire |
| Event | Image, title, date/time, venue/area, free or ticket price | Schedule, map, organizer, ticket/RSVP details, supplied accessibility information | RSVP / Get tickets / Add to calendar | Draft, published, cancelled, completed |
| Job | Title, employer, work mode/location, employment type, salary only if supplied, recency | Responsibilities, requirements, supplied benefits, closing date, application method | Apply / Contact employer | Draft, open, paused, closed/filled, reopen |
| Service | Service name, provider, category, service area, price model/price if supplied | Inclusions, exclusions, availability only if supported, area, provider and contact | Request quote / Message / Call / Book | Edit, pause, archive |
| Community | Name, icon/banner, purpose, member count only if real, privacy/join state | About, rules, member context, feed, flairs, moderation tools | Join / Request to join / Create post | Join/leave/request; moderators act by role |
| Local alert | Severity/type, affected area, posted/updated time, expiry/resolved state | Full facts, source/author, affected area, update history if stored, report/correction | Share / Report; other actions only if built | Active, updated, resolved, expired |
| General post | Author/avatar, time, text/media, optional flair, reactions/comments/save | Full content/media, comments, author and report controls | React / Comment / Save / Share | Edit/delete by owner; moderation by role |

### Display rules

1. Never invent a rating, review count, salary, stock level, availability, verification, distance or opening status. Hide unknowns or say Not provided.
2. Format money as South African rand. Store numeric money as integer cents or a documented numeric type—not formatted currency strings. “Free” is distinct from a missing price.
3. Status badges must reflect persisted state and relevant dates, not local component state.
4. Enforce owner and moderator actions in the database/server, not only by hiding UI controls.
5. Store unambiguous timestamps; events and recurring schedules need explicit timezone handling.
6. Public cards show a safe area/service area, never a private seller's exact home address.
7. Each category needs its own skeleton, empty state, validation, detail layout, filters and owner actions. Reuse visual primitives, not one universal card.
8. Use single-column lists on narrow screens. Use compact image tiles only where imagery is central and price/title remain legible. Do not wrap every text block in a card.
9. After category selection, progressively reveal relevant fields. Preserve drafts and validate inline.
10. Critical actions need explicit labels and accessible states; no essential action may rely on a hidden gesture.

## Category composer

Use one shared draft/publish pipeline with category-specific field schemas. The user selects a type once and sees only relevant fields—no giant universal form and no separate prompt for each category.

### Marketplace
Required: title, numeric price or explicit Free selection, condition, category, description, area and photo where required by product policy. Optional: negotiable, brand/model, quantity, delivery/collection, item specifications. Validate non-negative price and ZAR. Confirm before Mark sold; persist status and refresh discovery results. If price/condition/status are not stored in the database, do not fake them in the UI.

### Business
Required: name, primary category, short description, contact method and either a public business location or service area. Optional: logo, cover/gallery, hours, website, service catalogue, booking URL, accessibility attributes and social links. Do not require a street address for a service-area business. Business updates, offers and events are related objects, not the business profile itself.

### Deal
Required: title, merchant, description, start/end, redemption instructions and terms. Optional: original price, offer price, discount, coupon code, redemption limit (only if enforced). Calculate savings from numeric source values rather than trusting a conflicting manually typed percentage.

### Event
Required: title, start/end, timezone, in-person/online mode and venue/URL as appropriate. Optional: image, summary, organizer, ticket types/prices, capacity/RSVP, accessibility notes and recurrence. Validate end after start; distinguish cancelled/completed from upcoming.

### Job
Required: title, employer, location/work mode, employment type, description and application method. Optional: salary range and pay period, benefits, experience, skills, closing date and screening questions. Salary is never invented; validate minimum does not exceed maximum.

### Service
Required: service name, provider, description, service area/location and contact/request method. Optional: price model (fixed/from/quote/hourly), amount, duration, availability and booking URL. If no booking system exists, use Message/Call/Request quote, not a fake booking flow.

### Community and alert
Community: name, purpose, visibility, rules and moderator owner. Flairs only where supported. Alert: type, clear title, affected area, factual details, source/author and optional expiry. Resolve/expire must be persisted and role-protected.

## One source of truth: data and architecture

The current create screen exposes Post, Local alert, Event and Listing; categories include General, Business, Deals, Events, Marketplace, Jobs and Services. The generic social-post model includes kind/category/title/body/area/visibility/media, but does not demonstrate persisted typed fields for marketplace price, condition and sold state, deal terms, event schedule, job application settings or service pricing.

Before implementing the category cards/forms, inspect the live Supabase schema and existing repositories. Do not create duplicate tables if equivalent canonical entities already exist. The required domain model must persist and validate all category fields.

Recommended canonical entities (names are proposals, not claims that these tables already exist):
- Discussion posts: general discussion/media, not a bucket for every structured object.
- Marketplace listings: seller, price, currency, condition, category, status, negotiability and fulfilment.
- Business profiles: owner, category, description, public location/service area, contact, hours, media and published state.
- Business services: provider, description, pricing model/amount, duration and active state.
- Deals: merchant, terms, start/end, price/saving, redemption and status.
- Events: organizer, start/end/timezone, venue/online link, ticket/RSVP and lifecycle.
- Jobs: employer, work mode, employment type, salary range/period, description, application destination and lifecycle.
- Local alerts: type/severity, area, source, expiry and active/resolved state.
- Communities and membership/rules/flair entities as supported.

Implementation order:
1. Inspect live schema, current queries, RLS and existing typed entities before migrations.
2. Define canonical category types and typed domain contracts shared by composer, repository, discovery, details and tests.
3. Add/extend persisted fields, constraints, indexes, RLS and server-authorized lifecycle transitions.
4. Use one repository per domain; local storage may cache drafts, not compete as a second source for published data.
5. Build category-specific result cards, detail views, filters and forms on the same domain object.
6. Add atomic owner actions, cache invalidation and loading/error/success states.
7. Run migration/RLS tests, UI interaction tests, TypeScript/lint/Expo checks and Android builds; visually inspect narrow Android and responsive web.

## Definition of done

- [ ] Every category has a purpose-built composer, result card, detail page, filters, empty state and edit/owner controls.
- [ ] Marketplace price/condition/status persist after restart and across sessions; Mark sold removes it from available-only results.
- [ ] Business hours/contact/services are stored once and displayed consistently.
- [ ] Deals, events and jobs transition correctly between active/upcoming/expired/closed.
- [ ] Every CTA works end-to-end; no decorative controls, fake badges, placeholder actions or dead links.
- [ ] RLS/negative tests prove users cannot edit another user's listing/business/event/job or alter its status.
- [ ] Loading, empty, offline, permission-denied and retry states exist.
- [ ] All tests and native builds pass on the exact release commit; Android and web layouts are visually checked.
