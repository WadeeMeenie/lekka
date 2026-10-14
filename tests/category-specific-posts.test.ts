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
    expect(composer).toContain('placeholder="Price in R (e.g. 850)"');
    expect(composer).toContain("employmentType: jobType");
    expect(composer).toContain("venue: eventVenue.trim()");
    expect(feed).toContain("Mark as sold");
    expect(feed).toContain("marketplaceStatus === \"sold\"");
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
