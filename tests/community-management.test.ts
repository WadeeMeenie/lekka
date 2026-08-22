import { describe, expect, it } from "vitest";

import { canManageCommunityMember, canModerateCommunityContent, getCommunityMemberRoleLabel, validateCommunitySettings } from "../lib/community-management";

describe("community management", () => {
  it("allows an owner to manage another member", () => {
    expect(canManageCommunityMember("owner", "owner", "member")).toBe(true);
  });

  it("does not allow non-owners or self-management", () => {
    expect(canManageCommunityMember("owner", "member", "other")).toBe(false);
    expect(canManageCommunityMember("owner", "owner", "owner")).toBe(false);
    expect(canManageCommunityMember(null, "owner", "member")).toBe(false);
  });

  it("labels moderator state clearly", () => {
    expect(getCommunityMemberRoleLabel(true)).toBe("Moderator");
    expect(getCommunityMemberRoleLabel(false)).toBe("Member");
  });

  it("allows owners and moderators to moderate content, but not guests", () => {
    expect(canModerateCommunityContent("owner", "owner", false)).toBe(true);
    expect(canModerateCommunityContent("owner", "moderator", true)).toBe(true);
    expect(canModerateCommunityContent("owner", "member", false)).toBe(false);
  });

  it("normalizes valid settings and rejects invalid limits", () => {
    expect(validateCommunitySettings({ name: "  Bellville Neighbours ", description: "  Local updates  ", visibility: "public", rules: [" Be kind ", "", "Stay local"] })).toEqual({ valid: true, value: { name: "Bellville Neighbours", description: "Local updates", visibility: "public", rules: ["Be kind", "Stay local"] } });
    expect(validateCommunitySettings({ name: "No", description: "", visibility: "private", rules: [] }).valid).toBe(false);
    expect(validateCommunitySettings({ name: "Valid community", description: "x".repeat(501), visibility: "public", rules: [] }).valid).toBe(false);
  });
});
