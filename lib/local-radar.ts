import AsyncStorage from "@react-native-async-storage/async-storage";

export type FeedTab = "For You" | "Nearby" | "Trending" | "Following";
export type RadarCategory = "Food" | "Event" | "Deal" | "Job" | "Marketplace" | "Alert" | "Service" | "business" | "deal" | "event" | "job" | "marketplace" | "service";
export type PostKind = "post" | "alert";

export type LocalPost = {
  id: string;
  kind: PostKind;
  category?: RadarCategory;
  author: string;
  initials: string;
  profileImagePath?: string | null;
  area: string;
  distance: string;
  time: string;
  title?: string;
  body: string;
  likes: number;
  comments: number;
  trusted: boolean;
  accent: string;
};

export type RadarItem = {
  id: string;
  category: RadarCategory;
  title: string;
  subtitle: string;
  area: string;
  distance: string;
  time: string;
  accent: string;
  icon: string;
};

export type LocalSettings = {
  area: string;
  radius: string;
  useLocation: boolean;
  approximateVisibility: boolean;
};

export const defaultSettings: LocalSettings = { area: "Bellville", radius: "5 km", useLocation: false, approximateVisibility: true };

export const seededPosts: LocalPost[] = [
  { id: "p1", kind: "post", author: "Bellville Neighbourhood Watch", initials: "BN", area: "Bellville", distance: "0.7 km", time: "12 min", title: "Water-wise garden swap this Saturday", body: "Bring cuttings, seedlings, and stories. Everyone in the northern suburbs is welcome at the community garden.", likes: 42, comments: 8, trusted: true, accent: "#2F7D67" },
  { id: "p2", kind: "alert", category: "Alert", author: "Thandi M.", initials: "TM", area: "Oakdale", distance: "1.2 km", time: "28 min", title: "Community alert · Lost dog", body: "Small tan terrier last seen near the library. Please use the community gate rather than approaching if nervous.", likes: 19, comments: 11, trusted: false, accent: "#D95D4F" },
  { id: "p3", kind: "post", category: "Deal", author: "Harvest Table", initials: "HT", area: "Tyger Valley", distance: "2.4 km", time: "1 hr", title: "Local lunch special", body: "A seasonal bowl and iced rooibos for the neighbourhood this week. Show this post at the counter.", likes: 67, comments: 4, trusted: true, accent: "#E9A23B" },
];

export const seededRadar: RadarItem[] = [
  { id: "r1", category: "Food", title: "Harvest Table", subtitle: "Seasonal lunch special", area: "Tyger Valley", distance: "2.4 km", time: "Open now", accent: "#E9A23B", icon: "restaurant" },
  { id: "r2", category: "Event", title: "Sunset community run", subtitle: "All paces welcome", area: "Bellville", distance: "1.8 km", time: "Today · 18:00", accent: "#2F7D67", icon: "directions-run" },
  { id: "r3", category: "Alert", title: "Lost dog reported", subtitle: "Community reported", area: "Oakdale", distance: "1.2 km", time: "28 min ago", accent: "#D95D4F", icon: "campaign" },
  { id: "r4", category: "Job", title: "Weekend barista", subtitle: "Local café · part time", area: "Boston", distance: "3.1 km", time: "Posted today", accent: "#5E6AD2", icon: "work-outline" },
  { id: "r5", category: "Marketplace", title: "Solid wood desk", subtitle: "Good condition · R850", area: "Bellville", distance: "0.9 km", time: "Posted 2 hr ago", accent: "#8A6A4A", icon: "chair" },
];

export function rankPosts(posts: LocalPost[], tab: FeedTab): LocalPost[] {
  const scored = posts.map((post) => {
    const distanceScore = post.distance.includes("0.7") ? 4 : post.distance.includes("1.2") ? 3 : 2;
    const trustScore = post.trusted ? 2 : 0;
    const tabScore = tab === "Nearby" ? distanceScore : tab === "Following" && post.author.includes("Neighbourhood") ? 4 : tab === "Trending" ? post.likes / 10 : post.kind === "alert" ? 3 : 1;
    return { post, score: distanceScore + trustScore + tabScore };
  });
  return scored.sort((a, b) => b.score - a.score).map(({ post }) => post);
}

export type FeedPreference = "interested" | "not_interested";

export function personalizeFeed(posts: LocalPost[], tab: FeedTab, feedback: Record<string, FeedPreference>, currentUserPostIds: ReadonlySet<string> = new Set()): LocalPost[] {
  return rankPosts(posts.filter((post) => currentUserPostIds.has(post.id) || feedback[post.id] !== "not_interested"), tab)
    .sort((left, right) => Number(feedback[right.id] === "interested") - Number(feedback[left.id] === "interested"));
}

const POSTS_KEY = "local-radar/posts/v1";
const SETTINGS_KEY = "local-radar/settings/v1";
export async function loadPosts(): Promise<LocalPost[]> { const value = await AsyncStorage.getItem(POSTS_KEY); return value ? JSON.parse(value) : []; }
export async function savePosts(posts: LocalPost[]) { await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)); }
export async function loadSettings(): Promise<LocalSettings> { const value = await AsyncStorage.getItem(SETTINGS_KEY); return value ? { ...defaultSettings, ...JSON.parse(value) } : defaultSettings; }
export async function saveSettings(settings: LocalSettings) { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }