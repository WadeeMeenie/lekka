import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261028190000_harden_community_and_nearby_reads.sql"),
  "utf8",
).replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();

describe("launch hardening migration", () => {
  it("prevents non-owners from self-joining private communities", () => {
    const insertPolicy = migration.slice(
      migration.indexOf("create policy community_members_self_insert"),
      migration.indexOf("create or replace function public.nearby_feed_posts_page"),
    );

    expect(migration).toContain("drop policy if exists community_members_self_insert on public.community_members");
    expect(insertPolicy).toContain("(select auth.uid()) = user_id");
    expect(insertPolicy).toContain("c.visibility = 'public' or c.created_by = (select auth.uid())");
    expect(insertPolicy).toContain("is_moderator = false");
  });

  it("bounds all nearby RPC radii and rejects out-of-range coordinates", () => {
    expect(migration.match(/pg_catalog\.least\(pg_catalog\.greatest\(pg_catalog\.coalesce\(radius_meters, 5000\), 500\), 50000\)/g)).toHaveLength(4);
    expect(migration.match(/latitude between -90 and 90 and longitude between -180 and 180/g)).toHaveLength(4);
  });

  it("keeps private-profile and block checks in both authenticated detail and feed reads", () => {
    for (const predicate of [
      "not public.is_profile_private(p.author_id) or public.can_view_full_profile((select auth.uid()), p.author_id)",
      "not public.is_blocked_between((select auth.uid()), p.author_id)",
    ]) {
      expect(migration.split(predicate).length - 1).toBe(3);
    }

    expect(migration).toContain("grant execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) to authenticated");
    expect(migration).toContain("revoke all on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamp with time zone, uuid, integer) from public, anon");
    expect(migration).toContain("grant execute on function public.nearby_feed_posts_page(double precision, double precision, integer, timestamp with time zone, uuid, integer) to authenticated");
    expect(migration).toContain("revoke all on function public.nearby_feed_posts(double precision, double precision, integer) from public, anon");
    expect(migration).toContain("grant execute on function public.nearby_feed_posts(double precision, double precision, integer) to authenticated");
  });

  it("keeps nearby media authorization server-only while checking blocks and accepted buddies", () => {
    const helperStart = migration.indexOf("create or replace function public.can_access_nearby_post_media");
    const helper = migration.slice(helperStart);

    expect(helper).toContain("from public.blocks b");
    expect(helper).toContain("br.status = 'accepted'");
    expect(helper).toContain("author.is_private");
    expect(helper).toContain("revoke execute on function public.can_access_nearby_post_media");
    expect(helper).toContain("grant execute on function public.can_access_nearby_post_media(uuid, uuid, double precision, double precision, integer) to service_role");
  });
});
