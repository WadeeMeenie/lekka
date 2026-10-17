import { describe, expect, it } from "vitest";
import { personalizeFeed, type LocalPost } from "../lib/local-radar";

function post(id: string): LocalPost {
  return {
    id,
    kind: "post",
    authorId: "author-" + id,
    author: "Neighbour " + id,
    initials: id.slice(0, 2).toUpperCase(),
    area: "Bellville",
    distance: "Nearby",
    time: "Just now",
    body: "A real feed item",
    likes: 0,
    comments: 0,
    trusted: false,
    accent: "#2F7D67",
  };
}

describe("truthful feed personalization", () => {
  it("removes posts marked not interested and promotes only explicit interest feedback", () => {
    const personalized = personalizeFeed([post("p1"), post("p2"), post("p3")], {
      p2: "not_interested",
      p3: "interested",
    });
    expect(personalized.map((item) => item.id)).toEqual(["p3", "p1"]);
  });

  it("preserves server ordering when the user has not given feedback", () => {
    const feed = [post("p3"), post("p1"), post("p2")];
    expect(personalizeFeed(feed, {}).map((item) => item.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("does not invent trust, distance, engagement, Trending, or Following rankings", () => {
    const feed = [post("p3"), post("p1"), post("p2")];
    expect(personalizeFeed(feed, {}).map((item) => item.id)).toEqual(["p3", "p1", "p2"]);
  });
});
