import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("primary navigation hierarchy", () => {
  it("keeps the five primary jobs visible and the local directory reachable but secondary", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const explore = read("app/(tabs)/nearby.tsx");
    const menu = read("app/menu.tsx");
    expect(tabs).toContain('title: "Explore"');
    expect(tabs).toContain('title: "Communities"');
    expect(tabs).toContain('title: "Inbox"');
    expect(tabs).toContain('<Tabs.Screen name="local" options={{ href: null }} />');
    expect(explore).toContain('accessibilityLabel="Open local directory"');
    expect(explore).toContain('router.push("/(tabs)/local"');
    expect(menu).toContain('title: "Local directory"');
  });

  it("keeps Communities focused on groups and exposes messages as the Inbox tab", () => {
    const communities = read("app/(tabs)/social.tsx");
    const inbox = read("app/(tabs)/messages.tsx");
    const messages = read("app/(tabs)/messages.tsx");
    expect(communities).toContain('type Segment = "Communities" | "My communities"');
    expect(communities).not.toContain("MessagesPreview");
    expect(inbox).toContain("MessagesScreen inTab");
    expect(messages).toContain(">Inbox</Text>");
  });

  it("routes message actions from profiles and Buddies into the Inbox tab", () => {
    expect(read("app/public-profile/[id].tsx")).toContain('pathname: "/(tabs)/messages"');
    expect(read("app/buddies.tsx")).toContain('pathname: "/(tabs)/messages"');
  });
});
