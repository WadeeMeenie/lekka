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
    resolve(process.cwd(), "supabase/migrations/20260906001500_nearby_media_authorization.sql"),
    "utf8",
  ),
);
const nearbyMediaFunction = readFileSync(resolve(process.cwd(), "supabase/functions/nearby-media/index.ts"), "utf8");
const nearbyPostDetailFunction = readFileSync(resolve(process.cwd(), "supabase/functions/nearby-post-detail/index.ts"), "utf8");

const sectionBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreater(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("nearby media authorization", () => {
  it("removes nearby visibility from direct Storage authorization", () => {
    const storagePolicy = sectionBetween(
      migration,
      "create policy media_authenticated_read",
      "drop policy if exists media_authenticated_read on storage.objects",
    );

    expect(storagePolicy).toContain("bucket_id = 'local-radar-media'");
    expect(storagePolicy).toContain("p.visibility = 'public'");
    expect(storagePolicy).not.toContain("p.visibility = 'nearby'");
    expect(migration).toContain("drop policy if exists media_authenticated_read on storage.objects");
  });

  it("removes the nearby bypass from direct post_media metadata access", () => {
    const postMediaPolicy = sectionBetween(
      migration,
      "create policy post_media_public_read",
      "drop policy if exists media_authenticated_read on storage.objects",
    );

    expect(postMediaPolicy).toContain("p.author_id = (select auth.uid())");
    expect(postMediaPolicy).toContain("p.visibility = 'public'::public.visibility_scope");
    expect(postMediaPolicy).not.toContain("'nearby'::public.visibility_scope");
    expect(postMediaPolicy).not.toContain("using (true)");
  });

  it("keeps nearby authorization exclusively inside the server-only helper", () => {
    const helper = sectionBetween(
      migration,
      "create or replace function public.can_access_nearby_post_media",
      "revoke execute on function public.can_access_nearby_post_media",
    );

    expect(helper).toContain("p.visibility = 'nearby'::public.visibility_scope");
    expect(helper).toContain("security definer");
    expect(helper).toContain("set search_path = ''");
    expect(migration).toContain("revoke execute on function public.can_access_nearby_post_media");
    expect(migration).toContain("grant execute on function public.can_access_nearby_post_media");
  });

  it("validates the caller before issuing nearby signed URLs", () => {
    expect(nearbyMediaFunction).toContain("authClient.auth.getUser()");
    expect(nearbyMediaFunction).toContain("can_access_nearby_post_media");
    expect(nearbyMediaFunction).toContain("createSignedUrl");
    expect(nearbyMediaFunction).toContain("post_media");
    expect(nearbyMediaFunction).toContain("One or more media paths are not attached to this post");
  });

  it("uses the same location authorization before returning nearby post detail", () => {
    expect(nearbyPostDetailFunction).toContain("authClient.auth.getUser()");
    expect(nearbyPostDetailFunction).toContain("can_access_nearby_post_media");
    expect(nearbyPostDetailFunction).toContain("from(\"posts\")");
    expect(nearbyPostDetailFunction).toContain("createSignedUrl");
    expect(nearbyPostDetailFunction).toContain("radiusMeters");
  });
});
