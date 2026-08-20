# Local Radar SA — Mobile Interface Design Plan

## Product direction

Local Radar SA is a portrait-first, one-handed Android social network built around the question: “What matters around me right now?” The first release prioritises a focused local feed, Local Radar discovery, lightweight posting, local alerts, and a useful local directory. It should feel like a calm, premium native Android product rather than a web page or a clone of an existing social platform.

## Screen list

| Screen | Primary content and functionality |
|---|---|
| Home | Current area header, search, notifications, profile entry, feed tabs for For You, Nearby, Trending, and Following, plus local post cards with reaction, comment, share, and save actions. |
| Local Radar | Local discovery with list/map toggle, radius selector, category filters, and privacy-safe area markers for deals, events, alerts, jobs, services, and marketplace listings. |
| Create | Composer for text posts, local alerts, events, marketplace listings, job listings, and service requests. Includes audience/location visibility selection and publish confirmation. |
| Social | Segmented view for communities, friends/following, and messages. The MVP includes community discovery and conversation entry points. |
| Local | Directory landing screen for businesses, deals, events, marketplace, jobs, and services with category tiles and search. |
| Post detail | Full post content, author/area context, comments, reactions, save, report, and related nearby content. |
| Radar item detail | Detail view for a local listing, event, deal, alert, job, or service with approximate area, source, status, contact/action button, and report option. |
| Profile | User identity, area-level location, activity summary, saved items, and followed places/communities. |
| Search | Search field with recent searches and scoped results across people, places, businesses, communities, and local content. |
| Notifications | Local activity, comments, follows, alerts, event reminders, and moderation feedback. |
| Settings and privacy | Discovery radius, manual area selection, location permission explanation, approximate-location visibility, notification preferences, and account controls. |

## Key user flows

### Discover what is happening nearby

1. User opens Home and sees the selected area, such as Bellville.
2. User switches between For You and Nearby without leaving the feed.
3. User taps a post to open Post detail, or taps Local Radar to broaden discovery.
4. User adjusts the radius and category chips, then opens a Radar item detail.
5. User saves, shares, reports, contacts, or returns to the list using native back navigation.

### Publish a local alert

1. User taps the central Create tab.
2. User chooses Local Alert and selects a category such as road closure, outage, lost pet, or community issue.
3. User enters a short description and chooses an approximate area and audience.
4. User reviews the visibility summary and publishes.
5. The alert appears in the local feed and Radar with a reported status and report action.

### Publish a general post

1. User opens Create and chooses Post.
2. User enters text and optionally selects an image placeholder path for future media integration.
3. User chooses Nearby, My community, My followers, Public, or a specific group.
4. User publishes and receives immediate in-app confirmation.
5. The new post is inserted into the local feed and persisted locally.

### Configure privacy-safe location

1. User opens Settings and privacy.
2. User chooses current location or manual area selection.
3. User selects a discovery radius from 500 m through City, Province, South Africa, or Global.
4. User chooses approximate area visibility and can disable location without losing access to the rest of the product.
5. The selection is persisted on-device and reflected in Home and Radar headers.

## Layout and interaction rules

The app uses a five-destination bottom navigation bar: Home, Local Radar, Create, Social, and Local. The Create destination is visually elevated but remains a normal one-handed touch target. Every screen uses safe-area-aware containers, large touch targets, concise labels, clear pressed states, and accessible contrast. Lists use performant virtualised list components. Detail screens use a native-style top bar with back navigation and contextual actions. Empty, loading, error, and permission-denied states are designed as first-class content rather than dead ends.

## Brand and colour choices

The visual identity is called “Karoo Signal”: warm, grounded, and distinctly local without relying on stereotypes. The base is an ink navy for readability, with a sunlit amber action colour and a fynbos green secondary accent. A coral alert colour is reserved for urgent community notices.

| Token | Light value | Dark value | Use |
|---|---|---|---|
| Background | `#F7F8F5` | `#111816` | Main screen background |
| Surface | `#FFFFFF` | `#1B2421` | Cards, sheets, and elevated areas |
| Foreground | `#10211D` | `#F4F7F2` | Primary text |
| Muted | `#63736D` | `#A5B4AD` | Supporting text |
| Primary amber | `#E9A23B` | `#F2B451` | Main actions, active tab, discovery highlights |
| Fynbos green | `#2F7D67` | `#65B59B` | Secondary actions and trusted/community states |
| Alert coral | `#D95D4F` | `#F17C6D` | Local alerts and destructive actions |
| Border | `#DDE5DF` | `#33433D` | Dividers and card outlines |

Typography should use the platform sans-serif with strong weight contrast: compact, semibold headings; readable body copy; and subdued metadata. Imagery should favour real local context when available, with rounded 18–24 px cards, modest elevation, and no excessive gradients.

## MVP boundary

The first implementation will make the primary flows functional with local seed data and AsyncStorage persistence. Server routes, user authentication, uploads, live maps, push notifications, and cross-device sync remain clearly separated as integration points so the project can grow without presenting fake production capabilities.
