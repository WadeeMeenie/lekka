# Decisions

- Preserve Expo/React Native and Lekka's existing identity; repository disproves assumed Vite stack.
- Use isolated clone and dedicated branch; preserve other work.
- Existing SQL/static tests cannot substitute for live RLS evidence. Do not mutate production while access and migration history are unresolved.
- Retain pnpm 9.12.0 declared by repository; add lockfile and .npmrc hoisted linker required by existing Metro/NativeWind layout. No framework upgrade.
- Outbox mutex is per owner within one JS runtime, not a claim of distributed exactly-once delivery. Durable/server idempotency remains unresolved.
- Legal facts/contacts must come from operator and counsel; do not invent public policy statements.
