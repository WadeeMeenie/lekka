import { describe, expect, it } from "vitest";
import { assertSessionConfiguration } from "../server/_core/sdk";

describe("server session authorization configuration", () => {
  it("requires an application id and a sufficiently strong session secret", () => {
    expect(() => assertSessionConfiguration("lekka", "a".repeat(32))).not.toThrow();
    expect(() => assertSessionConfiguration("", "a".repeat(32))).toThrow(/VITE_APP_ID/);
    expect(() => assertSessionConfiguration("lekka", "a".repeat(31))).toThrow(/JWT_SECRET/);
  });
});
