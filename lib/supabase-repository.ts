import { readMediaBytes } from "@/lib/read-media-bytes";
import { AppState } from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { DeviceLocation } from "@/lib/location";
import { LocalPost, LocalSettings, RadarCategory, RadarItem, discoveryRadiusToMeters, loadSettings, savePosts } from "@/lib/local-radar";
import type { SocialPost } from "@/lib/social-repository";

function toLocalPost(row: any): LocalPost {
  const profile = row.profiles ?? null;
  const author = row.author_name || profile?.display_name || "Local neighbour";
  return { id: row.id, authorId: row.author_id ?? null, kind: row.kind === "alert" ? "alert" : "post", category: row.category ?? undefined, author, initials: author.slice(0, 2).toUpperCase(), profileImagePath: profile?.profile_image_path ?? null, mediaPath: row.post_media?.[0]?.storage_path ?? row.media_path ?? null, area: row.area, distance: formatDistanceLabel(row.distance_label), time: formatRelativeTime(row.created_at), title: row.title ?? undefined, body: row.body, likes: row.reaction_count ?? 0, comments: row.comment_count ?? 0, trusted: Number(row.trust_score ?? 0) >= 0.8, accent: row.kind === "alert" ? "#D95D4F" : "#2F7D67" };
}
function formatRelativeTime(value: string) { const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${minutes} min`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours} hr`; const days = Math.round(hours / 24); if (days < 30) return `${days} day${days === 1 ? "" : "s"}`; return `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? "" : "s"}`; }
function formatDistanceLabel(value?: string | null) {
  if (!value) return "Nearby";
  const raw = value.trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(m|km)$/i);
  if (!match) return raw;
  const amount = Number(match[1]);
  const meters = match[2].toLowerCase() === "km" ? amount * 1000 : amount;
  if (!Number.isFinite(meters)) return "Nearby";
  if (meters < 100) return "<100 m";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const kilometres = meters / 1000;
  return `${kilometres >= 10 ? Math.round(kilometres) : Number(kilometres.toFixed(1))} km`;
}
const PROFILE_SELECT = "profiles(display_name, profile_image_path)";

async function hydratePostData(posts: LocalPost[]): Promise<LocalPost[]> {
  if (!supabase || posts.length === 0) return posts;
  const ids = posts.map((post) => post.id);
  const authorIds = posts.map((post) => post.authorId).filter((id): id is string => Boolean(id));
  const [mediaResult, profileResult] = await Promise.all([
    supabase.from("post_media").select("post_id, storage_path, media_type, sort_order").in("post_id", ids).order("sort_order", { ascending: true }),
    authorIds.length ? supabase.from("profiles").select("id, display_name, profile_image_path").in("id", authorIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const firstMedia = new Map<string, string>();
  for (const row of (mediaResult.data ?? []) as Array<{ post_id: string; storage_path: string }>) if (!firstMedia.has(row.post_id)) firstMedia.set(row.post_id, row.storage_path);
  const profiles = new Map<string, { display_name: string; profile_image_path: string | null }>();
  for (const row of (profileResult.data ?? []) as Array<{ id: string; display_name: string; profile_image_path: string | null }>) profiles.set(row.id, row);
  return posts.map((post) => { const profile = post.authorId ? profiles.get(post.authorId) : undefined; return { ...post, author: profile?.display_name || post.author, initials: (profile?.display_name || post.author).slice(0, 2).toUpperCase(), profileImagePath: post.profileImagePath ?? profile?.profile_image_path ?? null, mediaPath: post.mediaPath ?? firstMedia.get(post.id) ?? null }; });
}

export async function fetchFeedPosts(location?: DeviceLocation): Promise<LocalPost[]> {
  // Supabase is the source of truth. Never substitute seeded/local cached posts
  // for a failed auth or network request; that makes fake/stale content look live.
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];
  const result = location ? await supabase.rpc("nearby_feed_posts", { latitude: location.latitude, longitude: location.longitude, radius_meters: 5000 }) : await supabase.from("posts").select(`id, author_id, kind, category, title, body, area, trust_score, created_at, ${PROFILE_SELECT}`).order("created_at", { ascending: false }).limit(50);
  if (result.error || !result.data) return [];
  const posts = await hydratePostData(result.data.map(toLocalPost));
  await savePosts(posts, user.id);
  return posts;
}

const localFeedListeners = new Set<() => void>();
let localFeedChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
let localFeedChannelStarting = false;
let localFeedChannelRemoving: Promise<void> | null = null;
let localFeedAppStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

function notifyLocalFeedListeners() { localFeedListeners.forEach((listener) => listener()); }

function removeLocalFeedChannel(channel = localFeedChannel) {
  if (!channel || !supabase) return localFeedChannelRemoving ?? Promise.resolve();
  if (localFeedChannel === channel) {
    localFeedChannel = null;
    localFeedChannelStarting = false;
  }
  const removal = supabase.removeChannel(channel).then(() => undefined).catch(() => undefined);
  localFeedChannelRemoving = removal;
  void removal.finally(() => {
    if (localFeedChannelRemoving === removal) localFeedChannelRemoving = null;
  });
  return removal;
}

function ensureLocalFeedAppStateListener() {
  if (localFeedAppStateSubscription) return;
  localFeedAppStateSubscription = AppState.addEventListener("change", (nextState) => {
    if (nextState === "active") {
      void ensureLocalFeedChannel();
      return;
    }
    void removeLocalFeedChannel();
  });
}

async function ensureLocalFeedChannel() {
  if (!supabase || localFeedListeners.size === 0 || localFeedChannel || localFeedChannelStarting) return;
  if (localFeedChannelRemoving) await localFeedChannelRemoving;
  if (!supabase || localFeedListeners.size === 0 || localFeedChannel || localFeedChannelStarting) return;
  localFeedChannelStarting = true;
  const channel = supabase.channel("local-radar-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, notifyLocalFeedListeners)
    .on("postgres_changes", { event: "*", schema: "public", table: "post_media" }, notifyLocalFeedListeners);
  localFeedChannel = channel;
  channel.subscribe((status) => {
    if (localFeedChannel === channel) localFeedChannelStarting = false;
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      if (localFeedChannel === channel) void removeLocalFeedChannel(channel).then(() => {
        if (localFeedListeners.size > 0 && AppState.currentState === "active") void ensureLocalFeedChannel();
      });
    }
  });
}

export function subscribeToLocalChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  localFeedListeners.add(onChange);
  ensureLocalFeedAppStateListener();
  void ensureLocalFeedChannel();
  return () => {
    localFeedListeners.delete(onChange);
    if (localFeedListeners.size === 0) {
      void removeLocalFeedChannel();
      localFeedAppStateSubscription?.remove();
      localFeedAppStateSubscription = null;
    }
  };
}

export async function createPost(input: { ownerId?: string; kind: LocalPost["kind"]; category?: RadarCategory; title?: string; body: string; area: string; visibility?: "nearby" | "public"; location?: DeviceLocation; businessId?: string }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { data: null, error: new Error("Please sign in to publish to the community") };
  if (input.ownerId && input.ownerId !== user.id) return { data: null, error: new Error("Sign in with the account that saved this draft to publish it") };
  const result = await supabase.from("posts").insert({ author_id: input.ownerId ?? user.id, kind: input.kind, category: input.category, title: input.title, body: input.body, business_id: input.businessId ?? null, area: input.area, visibility: input.visibility ?? "nearby", approximate_location: input.location ? `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})` : null }).select().single();
  if (!result.error) notifyLocalFeedListeners();
  return result;
}

export async function fetchNearbyItems(location?: DeviceLocation, settings?: LocalSettings, category?: RadarCategory | "All"): Promise<RadarItem[]> {
  const activeSettings = settings ?? await loadSettings(); if (!isSupabaseConfigured || !supabase || !location) return [];
  const { data, error } = await supabase.rpc("nearby_radar", { latitude: location.latitude, longitude: location.longitude, radius_meters: radiusToMeters(activeSettings.radius), category_filter: category && category !== "All" ? category : null }); if (error || !data) return []; return data as RadarItem[];
}
const radiusToMeters = discoveryRadiusToMeters;
export async function uploadMedia(uri: string, path: string, contentType: string) { if (!supabase) throw new Error("Backend is not configured"); const bytes = await readMediaBytes(uri); return supabase.storage.from("local-radar-media").upload(path, bytes, { contentType, upsert: false }); }

export async function attachPostMedia(input: { postId: string; storagePath: string; mediaType: "image" | "video"; width?: number; height?: number }) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const result = await supabase.from("post_media").insert({ post_id: input.postId, storage_path: input.storagePath, media_type: input.mediaType, width: input.width ?? null, height: input.height ?? null, sort_order: 0 }).select().single();
  if (!result.error) notifyLocalFeedListeners();
  return result;
}

export type FeedPage = { posts: LocalPost[]; nextCursor: string | null; hasMore: boolean; error?: Error | null };
export async function fetchFeedPage(location: DeviceLocation | undefined, cursor: string | null, pageSize = 20, radiusMeters = 5000): Promise<FeedPage> {
  if (!isSupabaseConfigured || !supabase) return { posts: [], nextCursor: null, hasMore: false, error: new Error("Supabase is not configured") };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) return { posts: [], nextCursor: null, hasMore: false, error: authError };
  if (!user) return { posts: [], nextCursor: null, hasMore: false, error: new Error("Please sign in to load your feed") };
  const cursorParts = cursor ? cursor.split("|") : []; const cursorCreatedAt = cursorParts.length > 1 ? cursorParts.slice(0, -1).join("|") : null; const cursorId = cursorParts.length > 1 ? cursorParts[cursorParts.length - 1] : null; let result: any;
  if (location) result = await supabase.rpc("nearby_feed_posts_page", { latitude: location.latitude, longitude: location.longitude, radius_meters: radiusMeters, cursor_created_at: cursorCreatedAt, cursor_id: cursorId, page_size: pageSize });
  else { let query = supabase.from("posts").select(`id, author_id, kind, category, title, body, trust_score, created_at, ${PROFILE_SELECT}`).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize); if (cursorCreatedAt && cursorId) query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`); result = await query; }
  if (result.error) return { posts: [], nextCursor: null, hasMore: false, error: result.error };
  if (!result.data) return { posts: [], nextCursor: null, hasMore: false, error: new Error("Supabase returned no feed data") };
  const rows = result.data as Array<{ id: string; created_at: string }>; const posts = await hydratePostData(rows.map(toLocalPost)); const next = rows.length === pageSize ? `${rows[rows.length - 1].created_at}|${rows[rows.length - 1].id}` : null; return { posts, nextCursor: next, hasMore: Boolean(next), error: null };
}

export async function listPublicProfilePosts(profileId: string, cursor: string | null, pageSize = 20) {
  if (!supabase) return { data: [] as SocialPost[], nextCursor: null as string | null, hasMore: false, error: new Error("Backend is not configured") };
  const cursorParts = cursor ? cursor.split("|") : []; const cursorCreatedAt = cursorParts.length > 1 ? cursorParts.slice(0, -1).join("|") : null; const cursorId = cursorParts.length > 1 ? cursorParts[cursorParts.length - 1] : null;
  let query = supabase.from("posts").select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles(id, display_name, username, profile_image_path), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)").eq("author_id", profileId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
  if (cursorCreatedAt && cursorId) query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`); const { data, error } = await query; const rows = (data ?? []) as unknown as SocialPost[]; const last = rows[rows.length - 1]; const nextCursor = rows.length === pageSize && last ? `${last.created_at}|${last.id}` : null; return { data: rows, nextCursor, hasMore: Boolean(nextCursor), error };
}
