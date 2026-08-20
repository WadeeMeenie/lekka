import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202608200001_local_radar_core.sql"), "utf8");

describe("Supabase security migration", () => {
  it("defines the primary product tables", () => {
    for (const table of ["profiles", "follows", "communities", "community_members", "businesses", "posts", "post_media", "comments", "reactions", "saved_posts", "reports", "notifications"]) {
      expect(migration).toContain(`create table public.${table}`);
    }
  });

  it("enables RLS and protects self-owned writes", () => {
    expect(migration).toContain("alter table public.posts enable row level security;");
    expect(migration).toContain("create policy posts_author_update");
    expect(migration).toContain("create policy posts_author_delete");
    expect(migration).toContain("auth.uid() = author_id");
    expect(migration).toContain("create policy businesses_owner_write");
  });

  it("keeps media in a private storage bucket with user-folder policies", () => {
    expect(migration).toContain("values ('local-radar-media', 'local-radar-media', false)");
    expect(migration).toContain("create policy media_user_upload");
    expect(migration).toContain("storage.foldername(name)");
  });
});
