# Authentication and authorization middleware audit — 2026-10-11

## Scope and verdict

This audit covers the server middleware, tRPC routers, OAuth/session SDK, service-backed helpers, Supabase Edge Functions, scheduled cleanup, nearby-media authorization, Yoco administration/webhooks, and live public `SECURITY DEFINER` function grants.

**Verdict:** the reachable application surface is mostly correctly separated between public, authenticated, admin, and service-role paths. Two local hardenings were applied: session JWT configuration now fails closed and binds tokens to the current app; the service-backed storage proxy was previously restricted to explicit public namespaces. Production remains not ready because repository/deployment drift prevents claiming that the local middleware is the deployed middleware.

## Server surface matrix

| Surface | Caller gate | Privileged operation | Result |
|---|---|---|---|
| `system.health` | Public | No data or side effect | Acceptable public endpoint. |
| `system.notifyOwner` | `adminProcedure`, requiring `ctx.user.role === "admin"` | Forge notification service key | Correctly gated; payload validation is present. |
| `auth.me` | Public procedure, returns only resolved context user | None | Acceptable; unauthenticated requests resolve to null. |
| `auth.logout` | Public mutation | Clears only the caller’s cookie | Low-impact and intentionally public. |
| tRPC context | Attempts session auth, falls back to anonymous context | None by itself | Correct pattern when every sensitive procedure uses `protectedProcedure`/`adminProcedure`; new procedures must not use `publicProcedure` accidentally. |
| OAuth callback/mobile exchange | Requires code and state; provider exchange then local session issuance | Creates session and upserts user | Provider exchange is the authorization boundary; state is currently redirect-URI state rather than a browser-bound nonce and remains a login-CSRF follow-up. |
| `/api/auth/me` | Local signed session cookie or Bearer session token | Reads current user and may sync user | Correct cryptographic/session gate after local hardening. |
| `/api/auth/session` | Valid local Bearer session token | Copies the authenticated token into an HTTP-only cookie | Correctly requires a valid token; CORS is now allowlisted. |
| `/manus-storage/*` | Public only for configured public prefixes | Forge service-key presign | Hardened: private keys and traversal-like paths are rejected. |
| Heartbeat helpers | Caller must supply a session to Forge; callback paths restricted to `/api/scheduled/` | Creates/updates/deletes project-scoped jobs through Forge | Helper is not registered as a public router; callers must preserve the owning-user session. |
| Data/image/LLM/notification helpers | Internal exports; no public route currently registers them except admin notification | Forge service key | Not independently reachable from the app router; keep future exposure behind protected/admin procedures. |

## Supabase Edge Function matrix

| Function | Authentication/authorization | Service-role use | Result |
|---|---|---|---|
| `nearby-media` | Requires Bearer user, validates with Supabase Auth, then calls `can_access_nearby_post_media`; verifies each requested path belongs to the post | Signs only authorized paths | Correct layered authorization. CORS wildcard is acceptable here because the function does not enable credentialed cookies and requires an explicit Bearer token. |
| `nearby-post-detail` | Requires Bearer user, validates with Supabase Auth, then applies the same location helper | Reads post and signs attached media only after authorization | Correct layered authorization. |
| `cleanup-media` | JWT verification disabled intentionally for scheduler; requires `x-media-cleanup-token`, validated by server-only Vault-backed RPC | Deletes only the fixed `local-radar-media` bucket and bounded queue batch | Correct scheduler boundary; token must remain in Vault and never be sent as `apikey`. |
| `yoco-create-checkout` | Requires Supabase user via Bearer token; database RPC checks business role and pending verification | Uses service role only for failure bookkeeping | Correct in the repository version, but production has a newer server-only RPC implementation and must be reconciled. |
| `yoco-webhook` | Public provider callback; verifies raw body, timestamp, HMAC signature, and webhook idempotency | Service-role event persistence and payment transition | Correct provider boundary in the repository version; production source is newer and must be synchronized. |
| `yoco-webhook-subscription` | Requires authenticated user and `is_platform_admin` RPC | Registers provider webhook and persists subscription | Correct admin boundary; returned secret is limited to the authenticated admin response. |
| `yoco-return` | Public redirect endpoint | No database or provider mutation | Acceptable as a fixed-scheme return bridge; it must not be treated as payment confirmation. |

## Live database evidence

The live project was inspected with bounded read-only catalog queries. Anonymous execution is denied for all listed application `SECURITY DEFINER` functions except the three unresolved `st_estimatedextent` overloads. Authenticated execution is limited to user-scoped/profile/business operations such as `get_my_profile`, `get_profile_for_viewer`, nearby reads, invitations, buddy operations, verification submission/review, and profile/business updates. Payment transitions, cleanup authorization, nearby authorization helpers, notification helpers, and server-only Yoco RPCs are service-role-only.

The exception remains material: `st_estimatedextent(text,text)`, its three-argument overload, and its four-argument overload are still executable by `anon`, `authenticated`, and `public`. Two live revoke migrations were recorded during this task, but the ACL did not change. The live migration runner is `postgres`; the extension-owned functions are owned by `supabase_admin`, and `postgres` cannot assume that role. This requires a supported elevated-owner/platform remediation; extension ownership must not be changed as a workaround.

## Local changes in this audit

The server SDK now requires a non-empty app id and a `JWT_SECRET` of at least 32 characters before signing or verifying sessions. Verified sessions must also carry the current configured app id; a token signed for another app is rejected. Empty session names remain valid because the name is presentation data rather than an authorization claim.

Regression coverage was added in `tests/server-authz.security.test.ts`. The existing CORS and storage-proxy hardenings remain covered by their focused security tests.

## Remaining risks and required follow-up

The OAuth `state` value is currently a base64-encoded redirect URI and is not bound to a browser session nonce. The external OAuth service may provide additional validation, but this implementation does not independently prevent login-CSRF/session swapping. Before broad web launch, add a server-issued, browser-bound state nonce or obtain documented provider-level protection and test it.

Production migration and Edge Function source drift remains a release blocker. The local grants, middleware, and function source cannot be treated as production evidence until the deployed versions are reconciled into Git.

Scheduled callbacks and any future route using `transcribeAudio`, `generateImage`, `callDataApi`, or heartbeat helpers must be exposed only through protected/admin procedures with input limits and per-user ownership checks. They are currently internal exports rather than public tRPC routes.
