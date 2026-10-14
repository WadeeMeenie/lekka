import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("reaction RPC wiring", () => {
  it("uses the uniquely named RPC that avoids overloaded PostgREST resolution", () => {
    const source = read("lib/atomic-social.ts");
    const migration = read("supabase/migrations/20261014200047_toggle_post_reaction_unambiguous.sql");

    expect(source).toContain('supabase.rpc("toggle_post_reaction", { p_post_id: postId, p_reaction: reaction })');
    expect(source).not.toContain('supabase.rpc("toggle_reaction",');
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.toggle_post_reaction(p_post_id uuid, p_reaction text)");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.toggle_post_reaction(uuid, text) FROM PUBLIC, anon");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.toggle_post_reaction(uuid, text) TO authenticated");
  });

  it("preserves all supported reaction values and toggle-off behavior", () => {
    const migration = read("supabase/migrations/20261014200047_toggle_post_reaction_unambiguous.sql");
    expect(migration).toContain("'👍','❤️','😂','😮','😢','😡'");
    expect(migration).toContain("IF v_existing = p_reaction THEN");
    expect(migration).toContain("RETURN NULL;");
  });
});
