import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "lib/social-repository.ts"), "utf8");
const blockMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261011114344_toggle_block_atomic_20261011.sql"),
  "utf8",
);
const likeMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261011114429_toggle_post_like_atomic.sql"),
  "utf8",
);

describe("social mutation concurrency", () => {
  it("uses atomic database toggles for reaction, save, follow and block", () => {
    expect(source).toContain('supabase.rpc("toggle_post_like", { p_post_id: postId })');
    expect(source).toContain('supabase.rpc("toggle_saved_post", { p_post_id: postId })');
    expect(source).toContain('supabase.rpc("toggle_follow", { p_profile_id: profileId })');
    expect(source).toContain('supabase.rpc("toggle_block", { p_profile_id: profileId })');
  });

  it("reports the returned database state only when the mutation succeeds", () => {
    expect(source).toContain("return { liked: result.data === true, error: result.error };");
    expect(source).toContain("return { saved: result.data === true, error: result.error };");
    expect(source).toContain("return { following: result.data === true, error: result.error };");
    expect(source).toContain("return { blocked: result.data === true, error: result.error };");
  });

  it("serializes block toggles and exposes the RPC only to authenticated callers", () => {
    expect(blockMigration).toContain("pg_advisory_xact_lock");
    expect(blockMigration).toContain("SECURITY INVOKER");
    expect(blockMigration).toContain("REVOKE ALL ON FUNCTION public.toggle_block(uuid) FROM PUBLIC, anon");
    expect(blockMigration).toContain("GRANT EXECUTE ON FUNCTION public.toggle_block(uuid) TO authenticated");
  });

  it("provides a unique, serialized like RPC instead of an overloaded ambiguous name", () => {
    expect(likeMigration).toContain("CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid)");
    expect(likeMigration).toContain("pg_advisory_xact_lock");
    expect(likeMigration).toContain("GRANT EXECUTE ON FUNCTION public.toggle_post_like(uuid) TO authenticated");
  });

  it("does not implement reaction/save/follow/block as client-side select-then-write", () => {
    for (const functionName of ["toggleReaction", "toggleSavedPost", "toggleFollow", "toggleBlock"]) {
      const start = source.indexOf(`export async function ${functionName}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const nextExport = source.indexOf("\nexport ", start + 1);
      const body = source.slice(start, nextExport === -1 ? undefined : nextExport);
      expect(body).not.toMatch(/\.from\("(reactions|saved_posts|follows|blocks)"\)\.select/);
      expect(body).not.toMatch(/\.from\("(reactions|saved_posts|follows|blocks)"\)\.(insert|delete|upsert)/);
    }
  });
});
