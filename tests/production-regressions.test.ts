import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reported Lekka production regressions", () => {
  it("uses only explicitly granted profile columns in post and saved-post joins", () => {
    const postDetail = read("lib/post-social.ts");
    const savedPosts = read("lib/saved-repository.ts");
    const nearbyDetail = read("supabase/functions/nearby-post-detail/index.ts");
    for (const source of [postDetail, savedPosts, nearbyDetail]) {
      expect(source).toContain("profiles!posts_author_id_fkey(id, display_name, username, profile_image_path)");
      expect(source).not.toContain("profiles!posts_author_id_fkey(id, display_name, username, bio, profile_image_path, interests, home_area)");
    }
  });

  it("writes the avatar through an owner-scoped RPC rather than direct profiles UPDATE", () => {
    const profile = read("lib/profile.ts");
    const migration = read("supabase/migrations/20261011210000_restore_policy_helpers_and_profile_avatar.sql");
    expect(profile).toContain('supabase.rpc("update_my_profile_avatar"');
    expect(profile).not.toContain('.from("profiles")');
    expect(migration).toContain("v_path !~");
    expect(migration).toContain("grant execute on function public.update_my_profile_avatar(text) to authenticated");
  });

  it("creates a community and its owner membership atomically", () => {
    const createScreen = read("app/community/create.tsx");
    const migration = read("supabase/migrations/20261011210000_restore_policy_helpers_and_profile_avatar.sql");
    expect(createScreen).toContain('supabase.rpc("create_community"');
    expect(createScreen).not.toContain('.from("communities").insert(');
    expect(createScreen).not.toContain('.from("community_members").upsert(');
    expect(migration).toContain("insert into public.community_members(community_id, user_id, is_moderator)");
    expect(migration).toContain("grant execute on function public.create_community(text, text, text, text, text, text[]) to authenticated");
  });

  it("saves personal identity without direct client writes to profiles", () => {
    const accountRepository = read("lib/account-repository.ts");
    const migration = read("supabase/migrations/20261011211500_save_personal_identity_rpc.sql");
    expect(accountRepository).toContain('supabase.rpc("save_personal_identity"');
    expect(accountRepository).not.toContain('.from("profiles")');
    expect(migration).toContain("update public.profiles");
    expect(migration).toContain("insert into public.personal_identities");
    expect(migration).toContain("grant execute on function public.save_personal_identity(text, text, date, text) to authenticated");
  });

  it("honors a manually selected Radar area for Local discovery", () => {
    const local = read("app/(tabs)/local.tsx");
    expect(local).toContain("settings.selectedLocation");
    expect(local).toContain("location: settings.selectedLocation");
  });

  it("provides retry and real navigation actions when community or post detail cannot load", () => {
    const community = read("app/community/[id].tsx");
    const post = read("app/post/[id].tsx");
    expect(community).toContain("Retry loading community");
    expect(community).toContain('router.replace("/(tabs)/social" as never)');
    expect(post).toContain("Back to Home");
    expect(post).toContain('router.replace("/(tabs)" as never)');
  });
});
