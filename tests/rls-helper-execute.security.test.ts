import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261014143000_restore_rls_helper_execution.sql"),
  "utf8",
);

describe("RLS helper execution grants", () => {
  it("restores authenticated execution for functions referenced by RLS policies", () => {
    for (const helper of [
      "is_blocked_between",
      "is_community_member",
      "is_community_owner",
      "can_manage_business",
      "is_business_manager",
      "can_view_full_profile",
      "is_profile_private",
    ]) {
      expect(migration).toContain(`grant execute on function public.${helper}(`);
      expect(migration).toContain("to authenticated");
    }
  });

  it("does not grant community membership probes to anonymous/public callers", () => {
    expect(migration).toContain("revoke execute on function public.is_community_member(uuid, uuid) from public, anon");
    expect(migration).toContain("revoke execute on function public.is_community_owner(uuid, uuid) from public, anon");
    expect(migration).not.toMatch(/grant execute on function public\.(is_community_member|is_community_owner)\([^;]+ to anon/i);
  });

  it("removes exposed PostGIS extent-estimation RPC execution", () => {
    expect(migration).toContain("public.st_estimatedextent(text, text)");
    expect(migration).toContain("public.st_estimatedextent(text, text, text)");
    expect(migration).toContain("public.st_estimatedextent(text, text, text, boolean)");
    expect(migration.match(/from public, anon, authenticated/g)?.length).toBe(3);
  });
});
