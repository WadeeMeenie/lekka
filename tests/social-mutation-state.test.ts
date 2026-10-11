import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "lib/social-repository.ts"), "utf8");

describe("social mutation state", () => {
  it("does not report successful state changes when reaction writes fail", () => {
    expect(source).toContain('return { liked: result.error ? true : false, error: result.error };');
    expect(source).toContain('return { liked: result.error ? false : true, error: result.error };');
  });

  it("does not report successful state changes when saved-post writes fail", () => {
    expect(source).toContain('return { saved: result.error ? true : false, error: result.error };');
    expect(source).toContain('return { saved: result.error ? false : true, error: result.error };');
  });

  it("does not report successful state changes when follow writes fail", () => {
    expect(source).toContain('return { following: result.error ? true : false, error: result.error };');
    expect(source).toContain('return { following: result.error ? false : true, error: result.error };');
  });

  it("does not report successful state changes when block writes fail", () => {
    expect(source).toContain('return { blocked: result.error ? true : false, error: result.error };');
    expect(source).toContain('return { blocked: result.error ? false : true, error: result.error };');
  });
});
