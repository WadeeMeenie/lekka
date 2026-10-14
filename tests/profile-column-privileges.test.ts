import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("profile write boundary", () => {
  it("revokes direct client column updates and keeps profile writes on validated RPCs", () => {
    const migration = read("supabase/migrations/20261014194107_revoke_direct_profile_column_updates.sql");
    const profile = read("lib/profile.ts");
    const identity = read("lib/account-repository.ts");

    expect(migration).toContain("REVOKE UPDATE");
    expect(migration).toContain("FROM anon, authenticated");
    expect(profile).toContain('supabase.rpc("update_my_profile"');
    expect(profile).toContain('supabase.rpc("update_my_profile_avatar"');
    expect(profile).not.toContain('.from("profiles").update(');
    expect(identity).toContain('supabase.rpc("save_personal_identity"');
    expect(identity).not.toContain('.from("profiles").update(');
  });
});
