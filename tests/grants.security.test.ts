import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905200000_tighten_sensitive_table_grants.sql"),
  "utf8",
);

describe("sensitive table grants", () => {
  it("removes anonymous reachability from sensitive tables", () => {
    for (const table of [
      "business_members",
      "business_invitations",
      "business_verification_requests",
      "payment_orders",
      "personal_identities",
      "platform_admins",
      "notifications",
      "reports",
      "saved_posts",
      "blocks",
      "buddy_requests",
      "yoco_webhook_subscriptions",
    ]) {
      expect(migration).toContain(`revoke all on table public.${table} from anon`);
    }
  });

  it("removes client mutation grants where writes are server-mediated", () => {
    expect(migration).toContain("revoke insert, delete on table public.business_invitations from authenticated");
    expect(migration).toContain("revoke insert, update, delete on table public.payment_orders from authenticated");
    expect(migration).toContain("revoke delete on table public.business_verification_requests from authenticated");
    expect(migration).toContain("revoke insert, delete on table public.notifications from authenticated");
    expect(migration).toContain("revoke insert, update, delete on table public.platform_admins from authenticated");
    expect(migration).toContain("revoke insert, update, delete on table public.yoco_webhook_subscriptions from authenticated");
    expect(migration).toContain("revoke delete on table public.reports from authenticated");
  });
});
