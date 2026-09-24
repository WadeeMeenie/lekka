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

describe("media security migration", () => {
  it("requires authenticated storage access and author-owned post media paths", () => {
    expect(mediaHardeningMigration).toContain("to authenticated");
    expect(mediaHardeningMigration).toContain("owner_id = (select auth.uid()::text)");
    expect(mediaHardeningMigration).toContain("validate_post_media_storage_path");
    expect(mediaHardeningMigration).toContain("Post media must belong to the post author storage namespace");
  });
});

describe("media lifecycle cleanup", () => {
  it("queues post media and profile media before Storage cleanup", () => {
    expect(mediaLifecycleMigration).toContain("create table if not exists public.media_cleanup_queue");
    expect(mediaLifecycleMigration).toContain("alter table public.media_cleanup_queue enable row level security");
    expect(mediaLifecycleMigration).toContain("revoke all on public.media_cleanup_queue from anon, authenticated");
    expect(mediaLifecycleMigration).toContain("after delete on public.post_media");
    expect(mediaLifecycleMigration).toContain("after delete on public.profiles");
    expect(mediaLifecycleMigration).toContain("after update of profile_image_path on public.profiles");
    expect(mediaLifecycleMigration).toContain("lekka-media-cleanup");
  });

  it("cleans up business logo replacement and deletion paths", () => {
    expect(businessLogoLifecycleMigration).toContain("enqueue_business_logo_media_cleanup");
    expect(businessLogoLifecycleMigration).toContain("after delete on public.businesses");
    expect(businessLogoLifecycleMigration).toContain("after update of logo_path on public.businesses");
    expect(businessLogoLifecycleMigration).toContain("where business.logo_path = objects.name");
  });

  it("uses the Storage API from a server-side function and retries failures", () => {
    expect(mediaCleanupFunction).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(mediaCleanupFunction).toContain("createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    expect(mediaCleanupFunction).toContain("service.storage");
    expect(mediaCleanupFunction).toContain(".remove([job.storage_path])");
    expect(mediaCleanupFunction).toContain("MAX_ATTEMPTS");
    expect(mediaCleanupFunction).toContain("next_attempt_at");
  });

  it("requires a server-only Vault-backed authorization token", () => {
    expect(mediaCleanupSecurityMigration).toContain("vault.create_secret");
    expect(mediaCleanupSecurityMigration).toContain("lekka_media_cleanup_token");
    expect(mediaCleanupSecurityMigration).toContain("revoke all on function public.authorize_media_cleanup(text) from public, anon, authenticated");
    expect(mediaCleanupSecurityMigration).toContain("grant execute on function public.authorize_media_cleanup(text) to service_role");
    expect(mediaCleanupFunction).toContain("x-media-cleanup-token");
    expect(mediaCleanupFunction).toContain("authorize_media_cleanup");
  });

  it("routes the scheduled worker through pg_net and never sends the cleanup token as the API key", () => {
    expect(mediaCleanupCronFixMigration).toContain("net.http_post");
    expect(mediaCleanupCronFixMigration).toContain("'apikey', 'sb_publishable_");
    expect(mediaCleanupCronFixMigration).toContain("'x-media-cleanup-token'");
  });
});

describe("client RPC execution privileges", () => {
  it("keeps privileged Yoco status mutation server-only", () => {
    expect(rpcPrivilegeMigration).toContain("revoke execute on function public.set_payment_order_status_from_yoco");
    expect(rpcPrivilegeMigration).toContain("grant execute on function public.set_payment_order_status_from_yoco");
    expect(rpcPrivilegeMigration).toContain("to service_role");
  });

  it("removes anonymous RPC access from authenticated-only social and business operations", () => {
    for (const functionName of [
      "is_business_manager",
      "get_or_create_direct_conversation",
      "create_community_post",
      "delete_own_post",
      "toggle_follow",
      "toggle_reaction",
      "toggle_saved_post",
    ]) {
      expect(rpcPrivilegeMigration).toContain(`revoke execute on function public.${functionName}`);
    }
  });
});

describe("direct messaging update security", () => {
  it("limits conversation and message updates to their intended columns and actor", () => {
    expect(messagingSecurityMigration).toContain("revoke update on table public.direct_conversations from authenticated");
    expect(messagingSecurityMigration).toContain("grant update (request_status) on table public.direct_conversations to authenticated");
    expect(messagingSecurityMigration).toContain("revoke update on table public.direct_messages from authenticated");
    expect(messagingSecurityMigration).toContain("grant update (read_at) on table public.direct_messages to authenticated");
    expect(messagingSecurityMigration).toContain("to authenticated");
    expect(messagingSecurityMigration).toContain("(select auth.uid()) <> sender_id");
  });
});

describe("profile authorization metadata", () => {
  it("prevents client roles from inserting or updating profiles.role", () => {
    expect(profileRoleSecurityMigration).toContain("revoke insert (role) on table public.profiles from anon, authenticated");
    expect(profileRoleSecurityMigration).toContain("revoke update (role) on table public.profiles from anon, authenticated");
  });
});

describe("business security-definer functions", () => {
  it("pins privileged business and payment functions to an empty search_path", () => {
    expect(businessFunctionSecurityMigration).toContain("set search_path = ''");
    expect(businessFunctionSecurityMigration).toContain("public.business_members");
    expect(businessFunctionSecurityMigration).toContain("public.payment_orders");
    expect(businessFunctionSecurityMigration).toContain("extensions.gen_random_uuid");
    expect(businessFunctionSecurityMigration).toContain("auth.uid()");
  });
});

describe("cross-account community and storage hardening", () => {
  it("pins remaining application SECURITY DEFINER functions to an empty search_path", () => {
    expect(crossAccountHardeningMigration).toContain("create or replace function public.is_community_member");
    expect(crossAccountHardeningMigration).toContain("create or replace function public.is_community_owner");
    expect(crossAccountHardeningMigration).toContain("create or replace function public.set_payment_order_status_from_yoco");
    expect(crossAccountHardeningMigration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(13);
    expect(crossAccountHardeningMigration).toContain("public.community_members");
    expect(crossAccountHardeningMigration).toContain("public.communities");
  });

  it("does not expose private-community membership to unrelated users", () => {
    expect(crossAccountHardeningMigration).toContain("community_members_read");
    expect(crossAccountHardeningMigration).toContain("c.visibility = 'public'");
    expect(crossAccountHardeningMigration).toContain("public.is_community_member");
    expect(crossAccountHardeningMigration).toContain("public.is_community_owner");
  });

  it("authorizes community branding reads by community visibility or membership", () => {
    expect(crossAccountHardeningMigration).toContain("community.logo_path = objects.name");
    expect(crossAccountHardeningMigration).toContain("community.cover_path = objects.name");
    expect(crossAccountHardeningMigration).toContain("community.visibility = 'public'");
    expect(crossAccountHardeningMigration).toContain("community.created_by = (select auth.uid())");
    expect(crossAccountHardeningMigration).toContain("public.is_community_member(community.id");
  });
});

describe("community RLS recursion hardening", () => {
  it("separates public discovery from member-only access", () => {
    expect(communityRlsRecursionMigration).toContain("create policy communities_public_read");
    expect(communityRlsRecursionMigration).toContain("using (visibility = 'public')");
    expect(communityRlsRecursionMigration).toContain("create policy communities_member_read");
    expect(communityRlsRecursionMigration).toContain("public.is_community_member(id, (select auth.uid()))");
    expect(communityRlsRecursionMigration).not.toContain("from public.community_members");
  });
});

describe("production hardening", () => {
  it("restores caller-owned block RLS and blocks cross-account reads/writes", () => {
    expect(productionHardeningMigration).toContain("create policy blocks_self_access");
    expect(productionHardeningMigration).toContain("using (blocker_id = auth.uid())");
    expect(productionHardeningMigration).toContain("with check (blocker_id = auth.uid())");
  });

  it("creates a single viewer-aware profile boundary and removes sensitive column SELECT grants", () => {
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

  it("returns the private profile fields only through the viewer-aware RPC", () => {
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
