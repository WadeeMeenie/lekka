import { describe, expect, it } from "vitest";

import { isStrongPassword } from "../lib/password-rules";
import { generateStrongPassword, SECURE_PASSWORD_LENGTH } from "../lib/secure-password-core";

describe("secure password generator", () => {
  it("generates a password that satisfies every Lekka password rule", () => {
    const password = generateStrongPassword((count) => Uint8Array.from({ length: count }, (_, index) => (index * 37) % 251));

    expect(password).toHaveLength(SECURE_PASSWORD_LENGTH);
    expect(isStrongPassword(password)).toBe(true);
    expect(password).not.toMatch(/\s/);
  });

  it.each([16, 20, 24, 32])("supports a configured length of %i characters", (length) => {
    const password = generateStrongPassword(() => Uint8Array.from({ length: length + 4 }, (_, index) => (index * 53) % 251), length);

    expect(password).toHaveLength(length);
    expect(isStrongPassword(password)).toBe(true);
  });

  it("rejects a length below the app password minimum", () => {
    expect(() => generateStrongPassword(() => new Uint8Array(20), 11)).toThrow(
      "Generated passwords must be at least 12 characters long.",
    );
  });
});
