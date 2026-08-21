import { describe, expect, it } from "vitest";
import { cursorForLast, decodeCursor, encodeCursor, mergeUniqueById } from "../lib/pagination";

describe("cursor pagination", () => {
  it("round-trips a timestamp and id without losing separators in the timestamp", () => {
    const cursor = encodeCursor({ createdAt: "2026-08-21T05:12:34.000Z", id: "post-2" });
    expect(decodeCursor(cursor)).toEqual({ createdAt: "2026-08-21T05:12:34.000Z", id: "post-2" });
  });

  it("only exposes a next cursor for a full page", () => {
    expect(cursorForLast([{ id: "a", created_at: "2026-08-21T05:00:00Z" }], 2)).toBeNull();
    expect(cursorForLast([{ id: "a", created_at: "2026-08-21T05:00:00Z" }, { id: "b", created_at: "2026-08-21T04:00:00Z" }], 2)).toBe("2026-08-21T04:00:00Z|b");
  });

  it("does not duplicate posts when a refresh and next page overlap", () => {
    expect(mergeUniqueById([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }])).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });
});
