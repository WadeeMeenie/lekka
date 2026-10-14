import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261014120000_harden_post_and_nearby_authorization.sql",
  ),
  "utf8",
).replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();

describe("post and nearby authorization hardening migration", () => {
  it("replaces permissive post-insert policies with one policy requiring author ownership", () => {
    expect(migration).toContain("drop policy if exists posts_author_write on public.posts");
    expect(migration).toContain('drop policy if exists "community members can create community posts" on public.posts');
    expect(migration).toContain("create policy posts_author_write on public.posts for insert to authenticated with check");
    expect(migration).toContain("(select auth.uid()) = author_id");
  });

  it("requires business authorization and community membership independently", () => {
    expect(migration).toContain("bm.role in ('owner', 'admin', 'manager')");
    expect(migration).toContain("bm.business_id = posts.business_id");
    expect(migration).toContain("cm.community_id = posts.community_id");
    expect(migration).toContain("cm.user_id = (select auth.uid())");
    expect(migration).toContain("c.created_by = (select auth.uid())");
  });

  it("applies block and private-profile rules to both nearby feed RPCs", () => {
    const blockChecks = migration.match(/not public\.is_blocked_between\(\(select auth\.uid\(\)\), p\.author_id\)/g) ?? [];
    const privateChecks = migration.match(/not public\.is_profile_private\(p\.author_id\)/g) ?? [];
    const fullProfileChecks = migration.match(/public\.can_view_full_profile\(\(select auth\.uid\(\)\), p\.author_id\)/g) ?? [];
    expect(blockChecks).toHaveLength(2);
    expect(privateChecks).toHaveLength(2);
    expect(fullProfileChecks).toHaveLength(2);
  });

  it("bounds radius and rejects out-of-range coordinates before querying location", () => {
    expect(migration.match(/latitude between -90 and 90/g) ?? []).toHaveLength(2);
    expect(migration.match(/longitude between -180 and 180/g) ?? []).toHaveLength(2);
    expect(migration.match(/pg_catalog\.least\(pg_catalog\.greatest\(radius_meters, 500\), 50000\)/g) ?? []).toHaveLength(2);
  });

  it("disables the unused detail RPC that returned the complete posts row", () => {
    expect(migration).toContain("revoke execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) from public, anon, authenticated");
    expect(migration).not.toContain("create or replace function public.nearby_post_detail");
  });

  it("keeps nearby feed functions authenticated-only and search-path hardened", () => {
    expect(migration.match(/security definer set search_path = ''/g) ?? []).toHaveLength(2);
    expect(migration).toContain("grant execute on function public.nearby_feed_posts(double precision, double precision, integer) to authenticated");
    expect(migration).toContain("grant execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamptz, uuid, integer) to authenticated");
  });
});
