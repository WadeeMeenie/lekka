import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("account menu profile identity", () => {
  const menu = readFileSync(resolve(process.cwd(), "app/menu.tsx"), "utf8");

  it("renders the authenticated user's signed profile photo instead of always showing initials", () => {
    expect(menu).toContain('import { Image } from "expo-image"');
    expect(menu).toContain('import { createSignedMediaUrl } from "@/lib/social-repository"');
    expect(menu).toContain("data?.profile_image_path");
    expect(menu).toContain("setProfileAvatarUrl(signed?.signedUrl ?? null)");
    expect(menu).toContain('Image source={{ uri: profileAvatarUrl }}');
    expect(menu).toContain("getAvatarInitials(displayName)");
  });

  it("clears photo state when the signed-in account has no profile image", () => {
    expect(menu).toContain("setProfileAvatarUrl(null)");
    expect(menu).toContain("if (!data?.profile_image_path)");
  });
});
