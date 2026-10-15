import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("primary navigation and profile UX contract", () => {
  it("exposes five distinct primary destinations without a duplicate Local tab", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    expect(tabs).toContain('title: "Home"');
    expect(tabs).toContain('title: "Explore"');
    expect(tabs).toContain('title: "Create"');
    expect(tabs).toContain('title: "Communities"');
    expect(tabs).toContain('title: "Inbox"');
    expect(tabs).toContain('name="local" options={{ href: null }}');
  });

  it("keeps messaging in the Inbox instead of hiding it in Communities", () => {
    const communities = read("app/(tabs)/social.tsx");
    const inbox = read("app/(tabs)/inbox.tsx");
    expect(communities).toContain('"Discover", "Joined"');
    expect(communities).not.toContain('"Messages"');
    expect(communities).not.toContain('"Following"');
    expect(inbox).toContain('import MessagesScreen from "../messages"');
  });

  it("opens the user's profile from the avatar while keeping the global menu reachable", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain('accessibilityLabel="Open your profile" onPress={() => router.push("/profile" as never)}');
    expect(home).toContain('accessibilityLabel="Open menu" onPress={() => router.push("/menu" as never)}');
  });
  it("gives Explore results a real detail destination for every discovery type", () => {
    const explore = read("app/(tabs)/nearby.tsx");
    const detail = read("app/discovery/[type]/[id].tsx");
    expect(explore).toContain('pathname: "/discovery/[type]/[id]"');
    expect(explore).toContain('accessibilityRole="button"');
    expect(detail).toContain('router.replace({ pathname: "/post/[id]"');
    expect(detail).toContain('router.replace({ pathname: "/local/[id]"');
    expect(detail).toContain('supabase.from("events")');
    expect(detail).toContain('supabase.from("deals")');
  });

});
