import { describe, expect, it } from "vitest";

describe("Expo build authentication", () => {
  it("accepts the configured Expo token", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token, "EXPO_TOKEN must be configured for this validation").toBeTruthy();

    const response = await fetch("https://api.expo.dev/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });
});
