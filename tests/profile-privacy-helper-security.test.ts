import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261023120000_move_profile_privacy_helper_private.sql"),
  "utf8",
);

describe("profile privacy helper API boundary", () => {
  it("moves the helper into the private schema and removes the public RPC", () => {
    expect(migration).toContain("create or replace function private.is_profile_private(owner_id uuid)");
    expect(migration).toContain("revoke all on schema private from public, anon");
    expect(migration).toContain("grant usage on schema private to authenticated");
    expect(migration).toContain("drop function public.is_profile_private(uuid)");
    expect(migration).not.toContain("create or replace function public.is_profile_private");
  });

  it("updates the posts RLS policy and both nearby feed RPCs together", () => {
    expect(migration).toContain("create policy posts_public_read");
    expect(migration).toContain("not private.is_profile_private(author_id)");
    expect(migration).toContain("create or replace function public.nearby_feed_posts_page");
    expect(migration).toContain("not private.is_profile_private(p.author_id)");
    expect(migration).toContain("create or replace function public.nearby_feed_posts(");
    expect(migration.match(/not private\\.is_profile_private\(p\.author_id\)/g)?.length).toBe(2);
  });

  it("preserves authenticated-only feed RPC grants", () => {
    expect(migration).toContain("revoke all on function public.nearby_feed_posts_page");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("revoke all on function public.nearby_feed_posts(double precision,double precision,integer) from public, anon");
  });
});
