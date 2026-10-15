import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDiscoveryDestination } from "../lib/discovery-navigation";

describe("canonical discovery destinations", () => {
  it("opens businesses on their business profile", () => {
    expect(getDiscoveryDestination({ sourceType: "business", id: "business-1", businessId: "business-1" })).toEqual({
      pathname: "/local/[id]",
      params: { id: "business-1" },
    });
  });

  it("opens event and deal records on a dedicated detail route", () => {
    expect(getDiscoveryDestination({ sourceType: "event", id: "event-1", businessId: "business-1" })).toEqual({
      pathname: "/discovery/[type]/[id]",
      params: { type: "event", id: "event-1" },
    });
    expect(getDiscoveryDestination({ sourceType: "deal", id: "deal-1", businessId: "business-1" })).toEqual({
      pathname: "/discovery/[type]/[id]",
      params: { type: "deal", id: "deal-1" },
    });
  });

  it("opens posts and alerts on the post detail route", () => {
    expect(getDiscoveryDestination({ sourceType: "post", id: "post-1", businessId: null })).toEqual({
      pathname: "/post/[id]",
      params: { id: "post-1" },
    });
    expect(getDiscoveryDestination({ sourceType: "alert", id: "alert-1", businessId: null })).toEqual({
      pathname: "/post/[id]",
      params: { id: "alert-1" },
    });
  });
});

describe("discovery content-type filtering", () => {
  const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261015130000_fix_discovery_category_filters.sql"), "utf8");

  it("filters category-backed posts by category instead of their generic post kind", () => {
    expect(migration).toContain("lower(coalesce(p.category,''))=n.content_type");
    for (const category of ["business", "deal", "event", "job", "marketplace", "service"]) {
      expect(migration).toContain("'" + category + "'");
    }
  });

  it("keeps ordinary posts and alerts distinct from category-specific listings", () => {
    expect(migration).toContain("n.content_type='alert' and p.kind='alert'");
    expect(migration).toContain("n.content_type='post' and p.kind='post'");
    expect(migration).toContain("limit least(greatest(coalesce(result_limit,100),1),100)");
  });
});
