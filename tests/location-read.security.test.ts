import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("location-scoped post read hardening", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260905210000_location_scoped_post_reads.sql"),
    "utf8",
  );
  const detailMigration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260905211000_nearby_post_detail_rpc.sql"),
    "utf8",
  );

  it("removes direct nearby visibility from posts RLS", () => {
    expect(migration).toContain("drop policy if exists posts_public_read on public.posts;");
    expect(migration).toContain("visibility = 'public'::public.visibility_scope");
    expect(migration).not.toMatch(/visibility\s*=\s*'nearby'::public\.visibility_scope\s*\)\s*;/);
  });

  it("makes nearby feed RPCs authenticated-only and search-path hardened", () => {
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("revoke execute on function public.nearby_feed_posts");
    expect(migration).toContain("grant execute on function public.nearby_feed_posts(double precision,double precision,integer) to authenticated;");
    expect(migration).toContain("revoke execute on function public.nearby_feed_posts_page");
    expect(migration).toContain("grant execute on function public.nearby_feed_posts_page(double precision,double precision,integer,timestamptz,uuid,integer) to authenticated;");
    expect(migration).toContain("public.st_dwithin");
  });

  it("keeps nearby post detail behind the same location boundary", () => {
    expect(detailMigration).toContain("create or replace function public.nearby_post_detail");
    expect(detailMigration).toContain("security definer");
    expect(detailMigration).toContain("set search_path = ''");
    expect(detailMigration).toContain("public.st_dwithin");
    expect(detailMigration).toContain("revoke execute on function public.nearby_post_detail");
    expect(detailMigration).toContain("grant execute on function public.nearby_post_detail(uuid, double precision, double precision, integer) to authenticated;");
  });
});
