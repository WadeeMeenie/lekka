import { describe, expect, it } from "vitest";

describe("Expo build authentication", () => {
  it.skip("accepts the configured Expo token when RUN_EXPO_TOKEN_TEST=true", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token, "EXPO_TOKEN must be configured for this manual validation").toBeTruthy();

    const response = await fetch("https://api.expo.dev/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });
});
