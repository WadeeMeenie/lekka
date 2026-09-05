import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) => readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const mediaHardeningMigration = readMigration("20260905150000_media_access_hardening.sql");
const mediaLifecycleMigration = readMigration("20260905160000_media_lifecycle_cleanup.sql");
const mediaCleanupSecurityMigration = readMigration("20260905171500_secure_media_cleanup_invocation.sql");
const mediaCleanupCronFixMigration = readMigration("20260905172000_fix_media_cleanup_cron_routing.sql");
const rpcPrivilegeMigration = readMigration("20260905173000_lock_down_client_rpc_execute_privileges.sql");
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
