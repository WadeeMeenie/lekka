import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DeviceLocation } from "@/lib/location";

export type FeedTab = "For You" | "Nearby" | "Trending" | "Following";
export type DiscoveryContentType = "all" | "post" | "alert" | "business" | "event" | "deal" | "job" | "marketplace" | "service";
export type RadarCategory = "Food" | "Event" | "Deal" | "Job" | "Marketplace" | "Alert" | "Service" | "business" | "deal" | "event" | "job" | "marketplace" | "service" | "general";
export type PostKind = "post" | "alert";

export type LocalPost = { id: string; authorId?: string | null; kind: PostKind; category?: RadarCategory; author: string; initials: string; profileImagePath?: string | null; mediaPath?: string | null; area: string; distance: string; time: string; title?: string; body: string; likes: number; comments: number; trusted: boolean; accent: string };
export type RadarItem = { id: string; category: RadarCategory; title: string; subtitle: string; area: string; distance: string; time: string; accent: string; icon: string };
export type LocalSettings = { area: string; radius: string; useLocation: boolean; approximateVisibility: boolean; selectedLocation: DeviceLocation | null };
export function discoveryRadiusToMeters(radius: string): number {
  if (radius.includes("500")) return 500;
  if (radius.includes("1 km")) return 1000;
  if (radius.includes("5 km")) return 5000;
  if (radius.includes("10 km")) return 10000;
  return 25000;
}
export const defaultSettings: LocalSettings = { area: "your area", radius: "5 km", useLocation: true, approximateVisibility: true, selectedLocation: null };

// Feed content is always loaded from Supabase. Do not keep hardcoded sample posts
// or client-side ranking heuristics here; they make demo content look like real activity.
export type FeedPreference = "interested" | "not_interested";
export function personalizeFeed(posts: LocalPost[], _tab: FeedTab, feedback: Record<string, FeedPreference>, currentUserPostIds: ReadonlySet<string> = new Set()): LocalPost[] {
  return posts
    .filter((post) => currentUserPostIds.has(post.id) || feedback[post.id] !== "not_interested")
    .sort((left, right) => Number(feedback[right.id] === "interested") - Number(feedback[left.id] === "interested"));
}
const POSTS_KEY = "local-radar/posts/v2";
const LEGACY_POSTS_KEY = "local-radar/posts/v1";
const SETTINGS_KEY = "local-radar/settings/v2";

function postsKey(userId?: string | null) {
  return userId ? POSTS_KEY + "/" + userId : POSTS_KEY + "/guest";
}

export async function loadPosts(userId?: string | null): Promise<LocalPost[]> {
  const key = postsKey(userId);
  const value = await AsyncStorage.getItem(key);
  if (value) return JSON.parse(value);
  if (!userId) return [];
  // Never carry an unscoped feed cache across authenticated identities.
  await AsyncStorage.removeItem(LEGACY_POSTS_KEY);
  return [];
}

export async function savePosts(posts: LocalPost[], userId?: string | null) {
  await AsyncStorage.setItem(postsKey(userId), JSON.stringify(posts));
}
export async function loadSettings(): Promise<LocalSettings> { const value = await AsyncStorage.getItem(SETTINGS_KEY); if (!value) { const legacy = await AsyncStorage.getItem("local-radar/settings/v1"); return legacy ? { ...defaultSettings, ...JSON.parse(legacy), selectedLocation: null } : defaultSettings; } return { ...defaultSettings, ...JSON.parse(value) }; }
export async function saveSettings(settings: LocalSettings) { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
