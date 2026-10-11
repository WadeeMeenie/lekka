import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllowedCorsOrigin } from "../server/_core/cors";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("credentialed CORS origin policy", () => {
  it("allows only an explicitly configured production origin", () => {
    vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://app.lekka.example, https://admin.lekka.example");

    expect(
      getAllowedCorsOrigin(
        { hostname: "api.lekka.example", protocol: "https" },
        "https://app.lekka.example",
      ),
    ).toBe("https://app.lekka.example");
    expect(
      getAllowedCorsOrigin(
        { hostname: "api.lekka.example", protocol: "https" },
        "https://attacker.example",
      ),
    ).toBeNull();
  });

  it("allows only the paired local preview frontend", () => {
    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "https://8081-preview.example",
      ),
    ).toBe("https://8081-preview.example");
    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "https://8081-other.example",
      ),
    ).toBeNull();
    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "http://8081-preview.example",
      ),
    ).toBeNull();
  });

  it("treats configured production origins as authoritative", () => {
    vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://app.lekka.example");

    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "https://8081-preview.example",
      ),
    ).toBeNull();
  });

  it("allows the local development frontend only on port 8081", () => {
    expect(
      getAllowedCorsOrigin(
        { hostname: "localhost", protocol: "http" },
        "http://localhost:8081",
      ),
    ).toBe("http://localhost:8081");
    expect(
      getAllowedCorsOrigin(
        { hostname: "localhost", protocol: "http" },
        "http://localhost:3001",
      ),
    ).toBeNull();
  });

  it("rejects malformed or credential-bearing origins", () => {
    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "https://user:password@8081-preview.example",
      ),
    ).toBeNull();
    expect(
      getAllowedCorsOrigin(
        { hostname: "3000-preview.example", protocol: "https" },
        "not-an-origin",
      ),
    ).toBeNull();
  });
});
