import { describe, expect, it } from "vitest";

describe("Supabase client configuration", () => {
  it("can reach the configured REST endpoint with the publishable key", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\//);
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key as string, Authorization: `Bearer ${key}` },
    });

    expect(response.status).toBe(200);
  }, 15000);
});
