import { File } from "expo-file-system/next";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { LocalPost, LocalSettings, RadarCategory, RadarItem, loadPosts, loadSettings, savePosts } from "@/lib/local-radar";

function toLocalPost(row: any): LocalPost {
  return {
    id: row.id,
    kind: row.kind === "alert" ? "alert" : "post",
    category: row.category ?? undefined,
    author: row.profiles?.display_name || "Local neighbour",
    initials: (row.profiles?.display_name || "LN").slice(0, 2).toUpperCase(),
    area: row.area,
    distance: row.distance_label || "Nearby",
    time: formatRelativeTime(row.created_at),
    title: row.title ?? undefined,
    body: row.body,
    likes: row.reaction_count ?? 0,
    comments: row.comment_count ?? 0,
    trusted: Number(row.trust_score ?? 0) >= 0.8,
    accent: row.kind === "alert" ? "#D95D4F" : "#2F7D67",
  };
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr`;
}

export async function fetchFeedPosts(): Promise<LocalPost[]> {
  const cached = await loadPosts();
  if (!isSupabaseConfigured || !supabase) return cached;
  const { data, error } = await supabase
    .from("posts")
    .select("id, kind, category, title, body, area, trust_score, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return cached;
  const posts = data.map(toLocalPost);
  await savePosts(posts);
  return posts;
}

export async function createPost(input: { kind: LocalPost["kind"]; category?: RadarCategory; title?: string; body: string; area: string; visibility?: "nearby" | "public" }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in to publish to the community") };
  return supabase.from("posts").insert({ author_id: user.id, kind: input.kind, category: input.category, title: input.title, body: input.body, area: input.area, visibility: input.visibility ?? "nearby" }).select().single();
}

export async function fetchNearbyItems(settings?: LocalSettings): Promise<RadarItem[]> {
  const activeSettings = settings ?? await loadSettings();
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.rpc("nearby_radar", { radius_meters: radiusToMeters(activeSettings.radius), area_name: activeSettings.area });
  if (error || !data) return [];
  return data as RadarItem[];
}

function radiusToMeters(radius: string) {
  if (radius.includes("500")) return 500;
  if (radius.includes("1 km")) return 1000;
  if (radius.includes("5 km")) return 5000;
  if (radius.includes("10 km")) return 10000;
  return 25000;
}

export async function uploadMedia(uri: string, path: string, contentType: string) {
  if (!supabase) throw new Error("Backend is not configured");
  const file = new File(uri);
  const bytes = await file.bytes();
  return supabase.storage.from("local-radar-media").upload(path, bytes, { contentType, upsert: false });
}

export function subscribeToLocalChanges(onChange: () => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client.channel("local-radar-live").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, onChange).subscribe();
  return () => { void client.removeChannel(channel); };
}
