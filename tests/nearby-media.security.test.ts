import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260906001500_nearby_media_authorization.sql"), "utf8");
const nearbyMediaFunction = readFileSync(resolve(process.cwd(), "supabase/functions/nearby-media/index.ts"), "utf8");
const nearbyPostDetailFunction = readFileSync(resolve(process.cwd(), "supabase/functions/nearby-post-detail/index.ts"), "utf8");

describe("nearby media authorization", () => {
  it("removes nearby visibility from direct Storage authorization", () => {
    expect(migration).toContain("p.visibility = 'public'");
    expect(migration).not.toContain("p.visibility = 'nearby'");
    expect(migration).toContain("drop policy if exists post_media_public_read");
    expect(migration).toContain("drop policy if exists media_authenticated_read");
  });

  it("removes the public post_media metadata bypass", () => {
    expect(migration).toContain("create policy post_media_public_read");
    expect(migration).toContain("p.author_id = (select auth.uid())");
    expect(migration).toContain("p.visibility = 'public'::public.visibility_scope");
    expect(migration).not.toContain("using (true)");
  });

  it("keeps the location authorization helper server-only", () => {
    expect(migration).toContain("create or replace function public.can_access_nearby_post_media");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
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
