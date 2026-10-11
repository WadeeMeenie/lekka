import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "lib/social-repository.ts"), "utf8");

describe("social mutation concurrency", () => {
  it("uses atomic database toggles for reaction, save, follow and block", () => {
    expect(source).toContain('supabase.rpc("toggle_reaction", { p_post_id: postId })');
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

  it("does not implement reaction/save/follow/block as client-side select-then-write", () => {
    const start = source.indexOf("export async function toggleReaction");
    const end = source.indexOf("export type PostFeedbackPreference");
    const toggles = source.slice(start, end);
    expect(toggles).not.toContain('.from("reactions").select');
    expect(toggles).not.toContain('.from("saved_posts").select');
    expect(toggles).not.toContain('.from("follows").select');
    expect(toggles).not.toContain('.from("blocks").select');
    expect(toggles).not.toContain('.from("blocks").insert');
  });
});
