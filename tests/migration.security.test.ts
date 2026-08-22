import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) => readFileSync(resolve(process.cwd(), `supabase/migrations/${name}`), "utf8");
const coreMigration = readMigration("202608200001_local_radar_core.sql");
const locationMigration = readMigration("202608200002_location_first_engine.sql");
const entitiesMigration = readMigration("202608200003_local_entities.sql");
const smartAccountsMigration = readMigration("202608210006_smart_accounts.sql");
const businessPostAuthorizationMigration = readMigration("202608210007_business_post_authorization.sql");
const businessMembershipRolesMigration = readMigration("202608210008_business_membership_roles.sql");
const businessInvitationsMigration = readMigration("202608210009_business_invitations.sql");
const preferencesAndBuddiesMigration = readMigration("202608220007_feed_preferences_buddies.sql");

describe("Supabase security migration", () => {
  it("defines the primary product tables", () => {
    for (const table of ["profiles", "follows", "communities", "community_members", "businesses", "posts", "post_media", "comments", "reactions", "saved_posts", "reports", "notifications"]) {
      expect(coreMigration).toContain(`create table public.${table}`);
    }
  });

  it("enables RLS and protects self-owned writes", () => {
    expect(coreMigration).toContain("alter table public.posts enable row level security;");
    expect(coreMigration).toContain("create policy posts_author_update");
    expect(coreMigration).toContain("create policy posts_author_delete");
    expect(coreMigration).toContain("auth.uid() = author_id");
    expect(coreMigration).toContain("create policy businesses_owner_write");
  });

  it("keeps media in a private storage bucket with user-folder policies", () => {
    expect(coreMigration).toContain("values ('local-radar-media', 'local-radar-media', false)");
    expect(coreMigration).toContain("create policy media_user_upload");
    expect(coreMigration).toContain("storage.foldername(name)");
  });

  it("uses current coordinates and PostGIS for nearby discovery", () => {
    expect(locationMigration).toContain("st_setsrid(st_makepoint(longitude, latitude), 4326)::geography");
    expect(locationMigration).toContain("st_dwithin");
    expect(locationMigration).toContain("create or replace function public.nearby_radar(");
    expect(locationMigration).toContain("create or replace function public.nearby_feed_posts(");
    expect(locationMigration).toContain("grant execute on function public.nearby_radar");
  });

  it("covers local businesses, events, deals, and their spatial indexes", () => {
    expect(entitiesMigration).toContain("create table if not exists public.business_members");
    expect(entitiesMigration).toContain("create table if not exists public.events");
    expect(entitiesMigration).toContain("create table if not exists public.deals");
    expect(entitiesMigration).toContain("events_location_gix");
    expect(entitiesMigration).toContain("deals_location_gix");
    expect(entitiesMigration).toContain("alter table public.events enable row level security;");
  });

  it("keeps personal identity private and creates business ownership atomically", () => {
    expect(smartAccountsMigration).toContain("create table if not exists public.personal_identities");
    expect(smartAccountsMigration).toContain("alter table public.personal_identities enable row level security;");
    expect(smartAccountsMigration).toContain("personal_identities_self_read");
    expect(smartAccountsMigration).toContain("auth.uid() = user_id");
    expect(smartAccountsMigration).toContain("create or replace function public.create_business_profile");
    expect(smartAccountsMigration).toContain("values (created_business.id, auth.uid(), 'owner')");
  });

  it("allows a business identity on a post only for an owner or manager", () => {
    expect(businessPostAuthorizationMigration).toContain("drop policy if exists posts_author_write");
    expect(businessPostAuthorizationMigration).toContain("bm.role in ('owner', 'manager')");
    expect(businessPostAuthorizationMigration).toContain("business_id is null or exists");
  });

  it("supports the future owner, admin, and staff access vocabulary without breaking legacy memberships", () => {
    expect(businessMembershipRolesMigration).toContain("'owner', 'admin', 'staff', 'manager', 'member'");
    expect(businessMembershipRolesMigration).toContain("bm.role in ('owner', 'admin', 'manager')");
  });

  it("binds business invitations to the recipient email and secure acceptance RPC", () => {
    expect(businessInvitationsMigration).toContain("create table if not exists public.business_invitations");
    expect(businessInvitationsMigration).toContain("alter table public.business_invitations enable row level security;");
    expect(businessInvitationsMigration).toContain("lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))");
    expect(businessInvitationsMigration).toContain("create or replace function public.accept_business_invitation");
    expect(businessInvitationsMigration).toContain("current_email <> lower(invitation.email)");
  });

  it("keeps post feedback private and Buddy actions behind authenticated RPCs", () => {
    expect(preferencesAndBuddiesMigration).toContain("create table public.post_feedback");
    expect(preferencesAndBuddiesMigration).toContain("alter table public.post_feedback enable row level security;");
    expect(preferencesAndBuddiesMigration).toContain("post_feedback_self_access");
    expect(preferencesAndBuddiesMigration).toContain("create table public.buddy_requests");
    expect(preferencesAndBuddiesMigration).toContain("buddy_requests_participant_read");
    expect(preferencesAndBuddiesMigration).toContain("create or replace function public.request_buddy");
    expect(preferencesAndBuddiesMigration).toContain("grant execute on function public.request_buddy(uuid) to authenticated;");
  });
});
