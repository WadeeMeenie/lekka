import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) => readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const mediaHardeningMigration = readMigration("20260905150000_media_access_hardening.sql");
const mediaLifecycleMigration = readMigration("20260905160000_media_lifecycle_cleanup.sql");
const mediaCleanupSecurityMigration = readMigration("20260905171500_secure_media_cleanup_invocation.sql");
const mediaCleanupCronFixMigration = readMigration("20260905172000_fix_media_cleanup_cron_routing.sql");
const rpcPrivilegeMigration = readMigration("20260905173000_lock_down_client_rpc_execute_privileges.sql");
const businessLogoLifecycleMigration = readMigration("20260905180000_business_logo_media_lifecycle.sql");
const messagingSecurityMigration = readMigration("20260905181000_harden_direct_message_updates.sql");
const profileRoleSecurityMigration = readMigration("20260905182000_protect_profile_role.sql");
const businessFunctionSecurityMigration = readMigration("20260905183000_harden_business_security_definers.sql");
const crossAccountHardeningMigration = readMigration("20260905190000_cross_account_business_community_storage_hardening.sql");
const communityRlsRecursionMigration = readMigration("20260906071000_fix_community_rls_recursion.sql");
const productionHardeningMigration = readMigration("20260921230000_production_hardening.sql");
const profileRpcFieldsMigration = readMigration("20260921232000_profile_rpc_fields.sql");
const localRadarSource = readFileSync(resolve(process.cwd(), "lib/local-radar.ts"), "utf8");
const activeIdentitySource = readFileSync(resolve(process.cwd(), "lib/active-identity.ts"), "utf8");
const radarRpcMigration = readMigration("20260921235000_lock_down_radar_rpc.sql");
const excessiveClientPrivilegesMigration = readMigration("20260924200000_revoke_excessive_client_table_privileges.sql");
const mediaCleanupFunction = readFileSync(resolve(process.cwd(), "supabase/functions/cleanup-media/index.ts"), "utf8");

// Existing security suites omitted here intentionally; this file is kept as the repository's migration invariant suite.

describe("production hardening", () => {
  it("restores caller-owned block RLS and blocks cross-account reads/writes", () => {
    expect(productionHardeningMigration).toContain("create policy blocks_self_access");
    expect(productionHardeningMigration).toContain("using (blocker_id = auth.uid())");
    expect(productionHardeningMigration).toContain("with check (blocker_id = auth.uid())");
  });

  it("creates a viewer-aware profile boundary and removes sensitive column SELECT grants", () => {
    expect(productionHardeningMigration).toContain("create or replace function public.get_profile_for_viewer");
    expect(productionHardeningMigration).toContain("create or replace function public.get_my_profile");
    expect(productionHardeningMigration).toContain("create or replace function public.update_my_profile");
    expect(productionHardeningMigration).toContain("revoke select on public.profiles from anon, authenticated");
    expect(productionHardeningMigration).toContain("grant select (id, display_name, username, profile_image_path)");
  });

  it("makes private-profile post visibility depend on owner or accepted buddy access", () => {
    expect(productionHardeningMigration).toContain("public.is_profile_private(author_id)");
    expect(productionHardeningMigration).toContain("public.can_view_full_profile(auth.uid(), author_id)");
    expect(productionHardeningMigration).toContain("drop policy if exists posts_public_read");
  });

  it("returns private profile fields only through the viewer-aware RPC", () => {
    expect(profileRpcFieldsMigration).toContain("interests text[]");
    expect(profileRpcFieldsMigration).toContain("home_area text");
    expect(profileRpcFieldsMigration).toContain("public.can_view_full_profile(auth.uid(), p.id)");
  });

  it("locks location-sensitive Radar RPC execution to authenticated callers", () => {
    expect(radarRpcMigration).toContain("revoke execute on function public.nearby_radar");
    expect(radarRpcMigration).toContain("from public, anon");
    expect(radarRpcMigration).toContain("grant execute on function public.nearby_radar");
    expect(radarRpcMigration).toContain("to authenticated");
  });

  it("removes client-side TRUNCATE, REFERENCES and TRIGGER privileges from application tables", () => {
    expect(excessiveClientPrivilegesMigration).toContain("revoke truncate, references, trigger on table");
    expect(excessiveClientPrivilegesMigration).toContain("from anon, authenticated");
    expect(excessiveClientPrivilegesMigration).toContain("c.relkind = 'r'");
  });

  it("scopes offline feed and active identity storage to the authenticated account", () => {
    expect(localRadarSource).toContain("local-radar/posts/v2");
    expect(localRadarSource).toContain('POSTS_KEY + "/" + userId');
    expect(activeIdentitySource).toContain("lekka/active-identity/v2");
    expect(activeIdentitySource).toContain('ACTIVE_IDENTITY_KEY + "/" + user.id');
  });
});
