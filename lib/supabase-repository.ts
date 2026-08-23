import { File } from "expo-file-system/next";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { DeviceLocation } from "@/lib/location";
import { LocalPost, LocalSettings, RadarCategory, RadarItem, loadPosts, loadSettings, savePosts } from "@/lib/local-radar";
import type { SocialPost } from "@/lib/social-repository";

function toLocalPost(row: any): LocalPost {
  return {
    id: row.id,
    kind: row.kind === "alert" ? "alert" : "post",
    category: row.category ?? undefined,
    author: row.author_name || row.profiles?.display_name || "Local neighbour",
    initials: (row.author_name || row.profiles?.display_name || "LN").slice(0, 2).toUpperCase(),
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

export async function fetchFeedPosts(location?: DeviceLocation): Promise<LocalPost[]> {
  const cached = await loadPosts();
  if (!isSupabaseConfigured || !supabase) return cached;
  const result = location
    ? await supabase.rpc("nearby_feed_posts", { latitude: location.latitude, longitude: location.longitude, radius_meters: 5000 })
    : await supabase.from("posts").select("id, kind, category, title, body, area, trust_score, created_at, profiles(display_name)").order("created_at", { ascending: false }).limit(50);
  const { data, error } = result;
  if (error || !data) return cached;
  const posts = data.map(toLocalPost);
  await savePosts(posts);
  return posts;
}

export async function createPost(input: { kind: LocalPost["kind"]; category?: RadarCategory; title?: string; body: string; area: string; visibility?: "nearby" | "public"; location?: DeviceLocation; businessId?: string }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in to publish to the community") };
  return supabase.from("posts").insert({ author_id: user.id, kind: input.kind, category: input.category, title: input.title, body: input.body, business_id: input.businessId ?? null, area: input.area, visibility: input.visibility ?? "nearby", approximate_location: input.location ? `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})` : null }).select().single();
}

export async function fetchNearbyItems(location?: DeviceLocation, settings?: LocalSettings, category?: RadarCategory | "All"): Promise<RadarItem[]> {
  const activeSettings = settings ?? await loadSettings();
  if (!isSupabaseConfigured || !supabase || !location) return [];
  const { data, error } = await supabase.rpc("nearby_radar", { latitude: location.latitude, longitude: location.longitude, radius_meters: radiusToMeters(activeSettings.radius), category_filter: category && category !== "All" ? category : null });
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

export async function attachPostMedia(input: { postId: string; storagePath: string; mediaType: "image" | "video"; width?: number; height?: number }) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase.from("post_media").insert({ post_id: input.postId, storage_path: input.storagePath, media_type: input.mediaType, width: input.width ?? null, height: input.height ?? null, sort_order: 0 }).select().single();
}

export type FeedPage = { posts: LocalPost[]; nextCursor: string | null; hasMore: boolean };

function parseRankCursor(cursor: string | null) {
  if (!cursor) return { seed: Math.random(), score: null as string | null, id: null as string | null };
  const parts = cursor.split("|");
  if (parts.length === 3) return { seed: Number(parts[0]) || 0.5, score: parts[1], id: parts[2] };
  return { seed: 0.5, score: null, id: null };
}

async function chronologicalFallback(location: DeviceLocation | undefined, cursor: string | null, pageSize: number): Promise<FeedPage> {
  if (!supabase) return { posts: [], nextCursor: null, hasMore: false };
  let query = supabase.from("posts").select("id, kind, category, title, body, area, trust_score, created_at, profiles(display_name)").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
  if (location) {
    const fallback = await supabase.rpc("nearby_feed_posts_page", { latitude: location.latitude, longitude: location.longitude, radius_meters: 5000, cursor_created_at: null, cursor_id: null, page_size: pageSize });
    if (!fallback.error && fallback.data) {
      const rows = fallback.data as any[];
      return { posts: rows.map(toLocalPost), nextCursor: null, hasMore: false };
    }
  }
  if (cursor) {
    const parts = cursor.split("|");
    const createdAt = parts.length > 1 ? parts[parts.length - 2] : null;
    const id = parts.length > 0 ? parts[parts.length - 1] : null;
    if (createdAt && id) query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
  }
  const result = await query;
  if (result.error || !result.data) return { posts: [], nextCursor: null, hasMore: false };
  const rows = result.data as any[];
  const last = rows[rows.length - 1];
  return { posts: rows.map(toLocalPost), nextCursor: rows.length === pageSize && last ? `${last.created_at}|${last.id}` : null, hasMore: rows.length === pageSize };
}

export async function fetchFeedPage(location: DeviceLocation | undefined, cursor: string | null, pageSize = 20): Promise<FeedPage> {
  const cached = await loadPosts();
  if (!isSupabaseConfigured || !supabase) return { posts: cursor ? [] : cached, nextCursor: null, hasMore: false };
  const parsed = parseRankCursor(cursor);
  const result = await supabase.rpc("ranked_feed_posts_page", { latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, radius_meters: 5000, cursor_score: parsed.score, cursor_id: parsed.id, page_size: pageSize, refresh_seed: parsed.seed });
  if (result.error || !result.data) {
    const fallback = await chronologicalFallback(location, cursor, pageSize);
    if (fallback.posts.length || cursor) return fallback;
    return { posts: cached, nextCursor: null, hasMore: false };
  }
  const rows = result.data as any[];
  const posts = rows.map(toLocalPost);
  const last = rows[rows.length - 1];
  const next = rows.length === pageSize && last ? `${parsed.seed}|${last.ranked_score ?? last.final_score}|${last.id}` : null;
  return { posts, nextCursor: next, hasMore: Boolean(next) };
}

export async function listPublicProfilePosts(profileId: string, cursor: string | null, pageSize = 20) {
  if (!supabase) return { data: [] as SocialPost[], nextCursor: null as string | null, hasMore: false, error: new Error("Backend is not configured") };
  const cursorParts = cursor ? cursor.split("|") : [];
  const cursorCreatedAt = cursorParts.length > 1 ? cursorParts.slice(0, -1).join("|") : null;
  const cursorId = cursorParts.length > 1 ? cursorParts[cursorParts.length - 1] : null;
  let query = supabase.from("posts").select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)").eq("author_id", profileId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
  if (cursorCreatedAt && cursorId) query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`);
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as SocialPost[];
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === pageSize && last ? `${last.created_at}|${last.id}` : null;
  return { data: rows, nextCursor, hasMore: Boolean(nextCursor), error };
}
