import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) => readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const mediaHardeningMigration = readMigration("20260905150000_media_access_hardening.sql");
const mediaLifecycleMigration = readMigration("20260905160000_media_lifecycle_cleanup.sql");
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
    expect(mediaCleanupFunction).toContain("withSupabase({ auth: \"publishable\" }");
    expect(mediaCleanupFunction).toContain("ctx.supabaseAdmin.storage");
    expect(mediaCleanupFunction).toContain(".remove([job.storage_path])");
    expect(mediaCleanupFunction).toContain("MAX_ATTEMPTS");
    expect(mediaCleanupFunction).toContain("next_attempt_at");
  });
});
