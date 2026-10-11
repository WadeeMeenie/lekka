import { afterEach, describe, expect, it, vi } from "vitest";
import { isPublicStorageKey, normalizeStorageKey } from "../server/_core/storageProxyPolicy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public storage proxy policy", () => {
  it("allows generated assets by default and rejects private namespaces", () => {
    expect(isPublicStorageKey("generated/image.png")).toBe(true);
    expect(isPublicStorageKey("profiles/private/avatar.png")).toBe(false);
  });

  it("uses configured public prefixes instead of exposing other namespaces", () => {
    vi.stubEnv("PUBLIC_STORAGE_PREFIXES", "public/, avatars");

    expect(isPublicStorageKey("public/logo.svg")).toBe(true);
    expect(isPublicStorageKey("avatars/user.png")).toBe(true);
    expect(isPublicStorageKey("generated/image.png")).toBe(false);
  });

  it("decodes safe keys and rejects traversal or malformed paths", () => {
    expect(normalizeStorageKey("generated%2Fimage.png")).toBe("generated/image.png");
    expect(normalizeStorageKey("generated/../private.txt")).toBeNull();
    expect(normalizeStorageKey("generated/%2e%2e/private.txt")).toBeNull();
    expect(normalizeStorageKey("/generated/image.png")).toBeNull();
    expect(normalizeStorageKey("generated/%ZZ.png")).toBeNull();
  });
});
