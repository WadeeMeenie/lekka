import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("account-switch privacy", () => {
  it("clears account-scoped Home feed and interaction state when the signed-in account changes", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain("previousUserId.current !== currentUserId");
    expect(home).toContain("setPosts([])");
    expect(home).toContain("setProfileImageUrls({})");
    expect(home).toContain("setPostImageUrls({})");
    expect(home).toContain("setFeedback({})");
  });

  it("reloads and clears private messages when the account or conversation changes", () => {
    const messages = read("app/messages.tsx");
    expect(messages).toContain("[isAuthenticated, user?.id, conversationId]");
    expect(messages).toContain("setSelected(null)");
    expect(messages).toContain("setMessages([])");
  });

  it("clears notifications and saved posts before loading another account", () => {
    const notifications = read("app/notifications.tsx");
    const saved = read("app/saved.tsx");
    expect(notifications).toContain("[isAuthenticated, user?.id]");
    expect(notifications).toContain("setItems([])");
    expect(saved).toContain("[isAuthenticated, user?.id]");
    expect(saved).toContain("setPosts([])");
  });

  it("refreshes account-specific relationship state on public profiles", () => {
    const profile = read("app/public-profile/[id].tsx");
    expect(profile).toContain("[id, user?.id]");
    expect(profile).toContain("setFollowing(false)");
  });
});

describe("post publishing navigation", () => {
  it("returns to Home only after a post is successfully published", () => {
    const create = read("app/(tabs)/create.tsx");
    expect(create).toContain('import { useRouter } from "expo-router";');
    expect(create).toContain('router.replace("/(tabs)")');
    expect(create).toContain('setUploadStage("published"); setText(""); setSelectedImage(null); clearCategoryFields(); setUploadError(null); router.replace("/(tabs)");');
  });
});
