import { describe, expect, it } from "vitest";

import { canManageCommunityMember, getCommunityMemberRoleLabel } from "../lib/community-management";

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
});
