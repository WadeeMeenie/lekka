import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("primary navigation hierarchy", () => {
  it("opens the user's profile from the Home avatar and keeps the menu separate", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain('accessibilityLabel="Open your profile" onPress={() => router.push("/profile" as never)}');
    expect(home).toContain('accessibilityLabel="Open menu" onPress={() => router.push("/menu" as never)}');
  });

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
    const messages = read("app/(tabs)/messages.tsx");
    expect(communities).toContain('type Segment = "Communities" | "My communities"');
    expect(communities).not.toContain("MessagesPreview");
    expect(messages).toContain(">Inbox</Text>");
  });

  it("routes message actions from profiles and Buddies into the Inbox tab", () => {
    expect(read("app/public-profile/[id].tsx")).toContain('pathname: "/(tabs)/messages"');
    expect(read("app/buddies.tsx")).toContain('pathname: "/(tabs)/messages"');
  });
  it("opens author profiles from feed avatars instead of reopening the post", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain("onOpenAuthor");
    expect(home).toContain('pathname:"/public-profile/[id]"');
    expect(home).toContain('pathname:"/local/[id]"');
    expect(home).toContain('accessibilityLabel={`Open ${post.author} profile`} onPress={onOpenAuthor}');
    expect(home).toContain('return <View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}');
    expect(home).toContain('accessibilityLabel="Open post details" onPress={onOpen}');
    expect(home).not.toContain('return <Pressable onPress={onOpen} style={[styles.card');
  });

});
