import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const normalizeSql = (value: string) =>
  value
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();

const migration = normalizeSql(
  readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260905210000_location_scoped_post_reads.sql"),
    "utf8",
  ),
);
const detailMigration = normalizeSql(
  readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260905211000_nearby_post_detail_rpc.sql"),
    "utf8",
  ),
);

const sectionBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("location-scoped post read hardening", () => {
  it("removes direct nearby visibility from the posts RLS policy", () => {
    const directReadPolicy = sectionBetween(
      migration,
      "create policy posts_public_read",
      "create or replace function public.nearby_feed_posts",
    );

    expect(directReadPolicy).toContain("drop policy if exists posts_public_read on public.posts;");
    expect(directReadPolicy).toContain("visibility = 'public'::public.visibility_scope");
    expect(directReadPolicy).not.toContain("'nearby'::public.visibility_scope");
  });

  it("keeps nearby visibility inside the location-scoped feed RPCs", () => {
    const nearbyFeedFunctions = sectionBetween(
      migration,
      "create or replace function public.nearby_feed_posts",
      "revoke execute on function public.nearby_feed_posts",
    );

    expect(nearbyFeedFunctions).toContain("p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)");
    expect(nearbyFeedFunctions).toContain("extensions.st_dwithin");
    expect(nearbyFeedFunctions).toContain("(select auth.uid()) is not null");
  });

  it("makes nearby feed RPCs authenticated-only and search-path hardened", () => {
    expect(migration).toMatch(/security definer\s+set search_path = ''/);
    expect(migration).toContain("revoke execute on function public.nearby_feed_posts");
    expect(migration).toMatch(
      /grant execute on function public\.nearby_feed_posts\(double precision,\s*double precision,\s*integer\) to authenticated;/,
    );
    expect(migration).toContain("revoke execute on function public.nearby_feed_posts_page");
    expect(migration).toMatch(
      /grant execute on function public\.nearby_feed_posts_page\(double precision,\s*double precision,\s*integer,\s*timestamptz,\s*uuid,\s*integer\) to authenticated;/,
    );
  });

  it("keeps nearby post detail behind the same location boundary", () => {
    expect(detailMigration).toContain("create or replace function public.nearby_post_detail");
    expect(detailMigration).toContain("security definer");
    expect(detailMigration).toContain("set search_path = ''");
    expect(detailMigration).toContain("extensions.st_dwithin");
    expect(detailMigration).toContain("p.visibility in ('public'::public.visibility_scope, 'nearby'::public.visibility_scope)");
    expect(detailMigration).toContain("revoke execute on function public.nearby_post_detail");
    expect(detailMigration).toMatch(
      /grant execute on function public\.nearby_post_detail\(uuid,\s*double precision,\s*double precision,\s*integer\) to authenticated;/,
    );
  });
});
