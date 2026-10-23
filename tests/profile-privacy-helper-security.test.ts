import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261023120000_move_profile_privacy_helper_private.sql"),
  "utf8",
);
const verification = readFileSync(
  resolve(process.cwd(), "supabase/verification/verify_profile_privacy_helper.sql"),
  "utf8",
);

describe("profile privacy helper API boundary", () => {
  it("moves the helper into the private schema and removes the public RPC", () => {
    expect(migration).toContain("create or replace function private.is_profile_private(owner_id uuid)");
    expect(migration).toContain("revoke all on schema private from public, anon");
    expect(migration).toContain("grant usage on schema private to authenticated");
    expect(migration).toContain("drop function public.is_profile_private(uuid)");
    expect(migration).not.toContain("create or replace function public.is_profile_private");
    expect(migration).toContain("set search_path = ''");
  });

  it("updates the posts RLS policy, both nearby feed RPCs, and detail RPC together", () => {
    expect(migration).toContain("create policy posts_public_read");
    expect(migration).toContain("not private.is_profile_private(author_id)");
    expect(migration).toContain("create or replace function public.nearby_feed_posts_page");
    expect(migration).toContain("create or replace function public.nearby_feed_posts(");
    expect(migration).toContain("create or replace function public.nearby_post_detail");
    expect(migration).toContain("not private.is_profile_private(p.author_id)");
    expect(migration.match(/not private\\.is_profile_private\\(p\\.author_id\\)/g)?.length).toBe(3);
  });

  it("prevents the nearby detail RPC from bypassing private-profile and block filtering", () => {
    const detail = migration.slice(migration.indexOf("create or replace function public.nearby_post_detail"));
    expect(detail).toContain("not public.is_blocked_between((select auth.uid()), p.author_id)");
    expect(detail).toContain("not private.is_profile_private(p.author_id)");
    expect(detail).toContain("public.can_view_full_profile((select auth.uid()), p.author_id)");
    expect(detail).toContain("revoke all on function public.nearby_post_detail");
    expect(detail).toContain("to authenticated");
  });

  it("preserves authenticated-only feed RPC grants", () => {
    expect(migration).toContain("revoke all on function public.nearby_feed_posts_page");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("revoke all on function public.nearby_feed_posts(double precision,double precision,integer) from public, anon");
  });

  it("ships a read-only post-deployment verifier for the actual catalog and grants", () => {
    expect(verification).toContain("to_regprocedure('public.is_profile_private(uuid)')");
    expect(verification).toContain("has_schema_privilege('authenticated', 'private', 'USAGE')");
    expect(verification).toContain("has_schema_privilege('anon', 'private', 'USAGE')");
    expect(verification).toContain("pg_policies");
    expect(verification).toContain("public.nearby_post_detail");
    expect(verification).toContain("raise notice 'PASS:");
    expect(verification).not.toMatch(/\\b(insert|update|delete|drop|alter|create)\\s+(table|schema|function|policy|role)\\b/i);
  });
});
