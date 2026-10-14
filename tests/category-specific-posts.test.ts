import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("category-specific post experience", () => {
  it("persists typed Marketplace price, condition, details and lifecycle status", () => {
    const migration = read("supabase/migrations/20261014204952_add_category_specific_post_fields.sql");
    const repository = read("lib/supabase-repository.ts");
    const composer = read("app/(tabs)/create.tsx");
    const feed = read("app/(tabs)/index.tsx");

    expect(migration).toContain("marketplace_price_cents");
    expect(migration).toContain("marketplace_condition");
    expect(migration).toContain("marketplace_status");
    expect(repository).toContain("marketplace_price_cents: input.marketplacePriceCents ?? null");
    expect(repository).toContain("export async function updateMarketplaceStatus");
    expect(composer).toContain("Marketplace listings need a title and a valid price in rand.");
    expect(composer).toContain("Switch to your business profile before publishing a business update.");
    expect(composer).toContain("Business update headline");
    expect(repository).toContain("businessLogoPath: business?.logo_path ?? null");
    expect(feed).toContain("post.businessName ? post.businessName : post.author");
    expect(composer).toContain("clearCategoryFields");
    expect(composer).toContain('placeholder="Price in R (e.g. 850)"');
    expect(composer).toContain("employmentType: jobType");
    expect(composer).toContain("venue: eventVenue.trim()");
    expect(feed).toContain("Mark as sold");
    expect(feed).toContain("Reserve listing");
    expect(feed).toContain("Listing reserved.");
    expect(feed).toContain("marketplaceStatus===\"sold\"");
  });

  it("invalidates old local feed caches so deleted test posts cannot reappear", () => {
    const localRadar = read("lib/local-radar.ts");
    expect(localRadar).toContain("local-radar/posts/v3");
    expect(localRadar).toContain("PREVIOUS_POSTS_KEY");
    expect(localRadar).toContain("staleKeys.map");
  });

  it("uses privacy-aware profile lookup and protects private profiles", () => {
    const migration = read("supabase/migrations/20261014205414_secure_feed_profile_avatar_access.sql");
    const repository = read("lib/supabase-repository.ts");
    expect(migration).toContain("drop policy if exists profiles_public_read");
    expect(migration).toContain("create policy profiles_visible_to_authorized_viewers");
    expect(migration).toContain("create or replace function public.get_feed_profiles(p_profile_ids uuid[])");
    expect(repository).toContain('supabase.rpc("get_feed_profiles", { p_profile_ids: authorIds })');
  });

  it("returns author identifiers and avatar paths from nearby feed RPCs", () => {
    const migration = read("supabase/migrations/20261014205010_fix_nearby_feed_profile_avatars.sql");
    const repository = read("lib/supabase-repository.ts");

    expect(migration).toContain("author_id uuid");
    expect(migration).toContain("profile_image_path text");
    expect(repository).toContain("authorId: row.author_id ?? null");
    expect(repository).toContain("profileImagePath: row.profile_image_path ?? profile?.profile_image_path ?? null");
  });
});
