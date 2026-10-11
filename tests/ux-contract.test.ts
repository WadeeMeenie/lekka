import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const home = source("app/(tabs)/index.tsx");
const create = source("app/(tabs)/create.tsx");
const local = source("app/(tabs)/local.tsx");
const nearby = source("app/(tabs)/nearby.tsx");
const social = source("app/(tabs)/social.tsx");

describe("Lekka UX contracts", () => {
  it("does not advertise post audiences the current write API cannot represent", () => {
    expect(create).toContain('const audiences = ["Nearby", "Public"]');
    expect(create).not.toContain('"My community"');
    expect(create).not.toContain('"My followers"');
  });

  it("does not advertise dedicated event or listing composers that do not exist yet", () => {
    expect(create).toContain('{ label: "Post", icon: "edit" as const }');
    expect(create).toContain('{ label: "Local alert", icon: "exclamationmark.triangle.fill" as const }');
    expect(create).not.toContain('{ label: "Event", icon: "calendar" as const }');
    expect(create).not.toContain('{ label: "Listing", icon: "cart.fill" as const }');
  });

  it("makes the Home location affordance open Radar and scopes search copy to the feed", () => {
    expect(home).toContain('accessibilityLabel="Change discovery area in Radar"');
    expect(home).toContain('router.push("/(tabs)/nearby" as never)');
    expect(home).toContain('placeholder="Search posts in your feed"');
  });

  it("supports a manually selected discovery area in the Local directory without requiring GPS", () => {
    expect(local).toContain('settings.selectedLocation');
    expect(local).toContain('location: settings.selectedLocation');
  });

  it("uses the shared destination heading hierarchy on the discovery and social screens", () => {
    expect(nearby).toContain('<LekkaScreenHeading eyebrow="LOCAL RADAR"');
    expect(social).toContain('<LekkaScreenHeading eyebrow="YOUR PEOPLE"');
    expect(local).toContain('<LekkaScreenHeading eyebrow="LOCAL DIRECTORY"');
    expect(create).toContain('<LekkaScreenHeading eyebrow="YOUR COMMUNITY"');
  });
});
