import { describe, expect, it } from "vitest";

describe("Supabase client configuration", () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const configured = Boolean(url && key);

  it.skipIf(!configured)("can reach the configured REST endpoint with the publishable key", async () => {
    expect(url).toMatch(/^https:\/\//);
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key as string, Authorization: `Bearer ${key}` },
    });

    expect(response.status).toBe(200);
  }, 15000);

  it("reports whether CI supplied the integration credentials", () => {
    if (!configured) {
      console.warn("Supabase integration test skipped: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not configured in this CI job.");
    }
    expect(typeof configured).toBe("boolean");
  });
});
