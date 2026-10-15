import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("message identity rendering", () => {
  const screen = readFileSync(resolve(process.cwd(), "app/messages.tsx"), "utf8");

  it("loads signed profile photos for conversation rows and the active thread", () => {
    expect(screen).toContain('import { Image } from "expo-image"');
    expect(screen).toContain('import { createSignedMediaUrl } from "@/lib/social-repository"');
    expect(screen).toContain("conversation.other_profile?.profile_image_path");
    expect(screen).toContain("conversationAvatarUrls[conversation.id]");
    expect(screen).toContain("conversationAvatarUrls[selected.id]");
    expect(screen).toContain("styles.threadAvatar");
  });

  it("keeps a readable initials fallback when a photo is absent or cannot be signed", () => {
    expect(screen).toContain("setConversationAvatarUrls({})");
    expect(screen).toContain("conversation.other_profile?.display_name?.slice(0, 1)");
  });
});
