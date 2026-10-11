import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("production query-support indexes", () => {
  it("indexes the posts community pinning foreign key", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20261011084000_index_posts_community_pinned_by.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE INDEX IF NOT EXISTS posts_community_pinned_by_idx");
    expect(migration).toMatch(/ON\s+public\.posts\s*\(\s*community_pinned_by\s*\)/i);
  });
});
