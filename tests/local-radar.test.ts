import { describe, expect, it } from "vitest";
import { personalizeFeed, type LocalPost } from "../lib/local-radar";

function post(id: string): LocalPost {
  return {
    id,
    kind: "post",
    authorId: `user-${id}`,
    author: `Author ${id}`,
    initials: "AU",
    area: "Test area",
    distance: "Nearby",
    time: "recent",
    body: `Real post ${id}`,
    likes: 0,
    comments: 0,
    trusted: false,
    accent: "#000000",
  };
}

describe("Supabase feed presentation", () => {
  it("does not invent, replace, or reorder backend feed content by fake ranking heuristics", () => {
    const rows = [post("a"), post("b"), post("c")];
    expect(personalizeFeed(rows, "Nearby", {})).toEqual(rows);
  });

  it("hides posts marked not interested", () => {
    const rows = [post("a"), post("b"), post("c")];
    expect(personalizeFeed(rows, "Nearby", { b: "not_interested" }).map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("prioritizes explicitly interested posts without fabricating engagement or distance", () => {
    const rows = [post("a"), post("b"), post("c")];
    expect(personalizeFeed(rows, "Nearby", { c: "interested" }).map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});
