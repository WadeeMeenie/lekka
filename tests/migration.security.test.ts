import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const readMigration = (name: string) => readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const mediaHardeningMigration = readMigration("20260905150000_media_access_hardening.sql");
describe("media security migration", () => {
  it("requires authenticated storage access and author-owned post media paths", () => {
    expect(mediaHardeningMigration).toContain("to authenticated");
    expect(mediaHardeningMigration).toContain("owner_id = (select auth.uid()::text)");
    expect(mediaHardeningMigration).toContain("validate_post_media_storage_path");
    expect(mediaHardeningMigration).toContain("Post media must belong to the post author storage namespace");
  });
});
