import { File } from "expo-file-system/next";
import { AppState } from "react-native";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { DeviceLocation } from "@/lib/location";
import { LocalPost, RadarCategory } from "@/lib/local-radar";
import type { SocialPost } from "@/lib/social-repository";

function toLocalPost(row: any): LocalPost {
  const profile = row.profiles ?? null;
  const author = row.author_name || profile?.display_name || "Local neighbour";
  return { id: row.id, authorId: row.author_id ?? null, kind: row.kind === "alert" ? "alert" : "post", category: row.category ?? undefined, author, initials: author.slice(0, 2).toUpperCase(), profileImagePath: row.profile_image_path ?? profile?.profile_image_path ?? null, mediaPath: row.post_media?.[0]?.storage_path ?? row.media_path ?? null, area: row.area, distance: formatDistanceLabel(row.distance_label), time: formatRelativeTime(row.created_at), title: row.title ?? undefined, body: row.body, likes: row.reaction_count ?? 0, comments: row.comment_count ?? 0, trusted: Number(row.trust_score ?? 0) >= 0.8, accent: row.kind === "alert" ? "#D95D4F" : "#2F7D67", details: row.details ?? {}, marketplacePriceCents: row.marketplace_price_cents ?? null, marketplaceCondition: row.marketplace_condition ?? null, marketplaceStatus: row.marketplace_status ?? "available", businessId: row.business_id ?? null };
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
const PROFILE_SELECT = "profiles(display_name)";

async function hydratePostData(posts: LocalPost[]): Promise<LocalPost[]> {
  if (!supabase || posts.length === 0) return posts;
  const ids = posts.map((post) => post.id);
  const authorIds = posts.map((post) => post.authorId).filter((id): id is string => Boolean(id));
  const [mediaResult, profileResult, listingResult] = await Promise.all([
    supabase.from("post_media").select("post_id, storage_path, media_type, sort_order").in("post_id", ids).order("sort_order", { ascending: true }),
    authorIds.length ? supabase.rpc("get_feed_profiles", { p_profile_ids: authorIds }) : Promise.resolve({ data: [], error: null }),
    supabase.from("posts").select("id, business_id, details, marketplace_price_cents, marketplace_condition, marketplace_status").in("id", ids),
  ]);
  const firstMedia = new Map<string, string>();
  for (const row of (mediaResult.data ?? []) as Array<{ post_id: string; storage_path: string }>) if (!firstMedia.has(row.post_id)) firstMedia.set(row.post_id, row.storage_path);
  const profiles = new Map<string, { display_name: string; profile_image_path: string | null }>();
  for (const row of (profileResult.data ?? []) as Array<{ id: string; display_name: string; profile_image_path: string | null }>) profiles.set(row.id, row);
  const listingData = new Map<string, { business_id: string | null; details: Record<string, unknown> | null; marketplace_price_cents: number | null; marketplace_condition: LocalPost["marketplaceCondition"]; marketplace_status: LocalPost["marketplaceStatus"] }>();
  for (const row of (listingResult.data ?? []) as Array<{ id: string; business_id: string | null; details: Record<string, unknown> | null; marketplace_price_cents: number | null; marketplace_condition: LocalPost["marketplaceCondition"]; marketplace_status: LocalPost["marketplaceStatus"] }>) listingData.set(row.id, row);
  const businessIds = [...new Set([...listingData.values()].map((row) => row.business_id).filter((id): id is string => Boolean(id)))];
  const businessResult = businessIds.length ? await supabase.from("businesses").select("id, name, logo_path, verification_state").in("id", businessIds) : { data: [], error: null };
  const businesses = new Map<string, { name: string; logo_path: string | null; verification_state: string }>();
  for (const row of (businessResult.data ?? []) as Array<{ id: string; name: string; logo_path: string | null; verification_state: string }>) businesses.set(row.id, row);
  return posts.map((post) => { const profile = post.authorId ? profiles.get(post.authorId) : undefined; const listing = listingData.get(post.id); const businessId = listing?.business_id ?? post.businessId ?? null; const business = businessId ? businesses.get(businessId) : undefined; return { ...post, author: profile?.display_name || post.author, initials: (business?.name || profile?.display_name || post.author).slice(0, 2).toUpperCase(), profileImagePath: post.profileImagePath ?? profile?.profile_image_path ?? null, mediaPath: post.mediaPath ?? firstMedia.get(post.id) ?? null, details: listing?.details ?? post.details ?? {}, marketplacePriceCents: listing?.marketplace_price_cents ?? post.marketplacePriceCents ?? null, marketplaceCondition: listing?.marketplace_condition ?? post.marketplaceCondition ?? null, marketplaceStatus: listing?.marketplace_status ?? post.marketplaceStatus ?? "available", businessId, businessName: business?.name ?? null, businessLogoPath: business?.logo_path ?? null, businessVerified: business?.verification_state === "verified" }; });
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

export async function createPost(input: { kind: LocalPost["kind"]; category?: RadarCategory; title?: string; body: string; area: string; visibility?: "nearby" | "public"; location?: DeviceLocation; businessId?: string; details?: Record<string, unknown>; marketplacePriceCents?: number; marketplaceCondition?: LocalPost["marketplaceCondition"] }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { data: null, error: new Error("Please sign in to publish to the community") };
  const result = await supabase.from("posts").insert({ author_id: user.id, kind: input.kind, category: input.category, title: input.title, body: input.body, details: input.details ?? {}, marketplace_price_cents: input.marketplacePriceCents ?? null, marketplace_condition: input.marketplaceCondition ?? null, marketplace_status: "available", business_id: input.businessId ?? null, area: input.area, visibility: input.visibility ?? "nearby", approximate_location: input.location ? `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})` : null }).select().single();
  if (!result.error) notifyLocalFeedListeners();
  return result;
}


export async function updateMarketplaceStatus(postId: string, status: "available" | "reserved" | "sold") {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in to manage a listing") };
  const result = await supabase.from("posts").update({ marketplace_status: status, updated_at: new Date().toISOString() }).eq("id", postId).eq("author_id", user.id).eq("category", "marketplace").select("id, marketplace_status").single();
  if (!result.error) notifyLocalFeedListeners();
  return result;
}

export async function uploadMedia(uri: string, path: string, contentType: string) { if (!supabase) throw new Error("Backend is not configured"); const file = new File(uri); const bytes = await file.bytes(); return supabase.storage.from("local-radar-media").upload(path, bytes, { contentType, upsert: true }); }

export async function attachPostMedia(input: { postId: string; storagePath: string; mediaType: "image" | "video"; width?: number; height?: number }) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const existing = await supabase.from("post_media").select().eq("post_id", input.postId).eq("storage_path", input.storagePath).maybeSingle();
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data) {
    notifyLocalFeedListeners();
    return existing;
  }
  const result = await supabase.from("post_media").insert({ post_id: input.postId, storage_path: input.storagePath, media_type: input.mediaType, width: input.width ?? null, height: input.height ?? null, sort_order: 0 }).select().single();
  if (!result.error) notifyLocalFeedListeners();
  return result;
}

export type FeedPage = { posts: LocalPost[]; nextCursor: string | null; hasMore: boolean; error: { message: string } | null };

export async function fetchFeedPage(location: DeviceLocation | undefined, cursor: string | null, pageSize = 20, radiusMeters = 5000, areaFilter?: string): Promise<FeedPage> {
  const emptyPage = (error: { message: string } | null): FeedPage => ({ posts: [], nextCursor: null, hasMore: false, error });
  if (!isSupabaseConfigured || !supabase) return emptyPage(new Error("Supabase is not configured"));
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) return emptyPage(authError);
    if (!user) return emptyPage(new Error("Please sign in to load your feed"));
    const cursorParts = cursor ? cursor.split("|") : [];
    const cursorCreatedAt = cursorParts.length > 1 ? cursorParts.slice(0, -1).join("|") : null;
    const cursorId = cursorParts.length > 1 ? cursorParts[cursorParts.length - 1] : null;
    let result: any;
    if (location) {
      result = await supabase.rpc("nearby_feed_posts_page", {
        latitude: location.latitude,
        longitude: location.longitude,
        radius_meters: radiusMeters,
        cursor_created_at: cursorCreatedAt,
        cursor_id: cursorId,
        page_size: pageSize,
      });
    } else {
      const normalizedArea = areaFilter?.trim();
      if (!normalizedArea || normalizedArea.toLowerCase() === "your area") {
        return emptyPage(new Error("Choose an area or allow approximate location to see nearby posts"));
      }
      let query = supabase.from("posts").select("id, author_id, kind, category, title, body, trust_score, created_at, " + PROFILE_SELECT)
        .ilike("area", "%" + normalizedArea + "%")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
      if (cursorCreatedAt && cursorId) query = query.or("created_at.lt." + cursorCreatedAt + ",and(created_at.eq." + cursorCreatedAt + ",id.lt." + cursorId + ")");
      result = await query;
    }
    if (result.error) return emptyPage(result.error);
    if (!result.data) return emptyPage(new Error("Supabase returned no feed data"));
    const rows = result.data as Array<{ id: string; created_at: string }>;
    const posts = await hydratePostData(rows.map(toLocalPost));
    const next = rows.length === pageSize ? `${rows[rows.length - 1].created_at}|${rows[rows.length - 1].id}` : null;
    return { posts, nextCursor: next, hasMore: Boolean(next), error: null };
  } catch (error) {
    return emptyPage(error instanceof Error ? error : new Error("Could not load the feed"));
  }
}
export async function listPublicProfilePosts(profileId: string, cursor: string | null, pageSize = 20) {
  if (!supabase) return { data: [] as SocialPost[], nextCursor: null as string | null, hasMore: false, error: new Error("Backend is not configured") };
  const cursorParts = cursor ? cursor.split("|") : []; const cursorCreatedAt = cursorParts.length > 1 ? cursorParts.slice(0, -1).join("|") : null; const cursorId = cursorParts.length > 1 ? cursorParts[cursorParts.length - 1] : null;
  let query = supabase.from("posts").select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles(id, display_name, username, profile_image_path), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)").eq("author_id", profileId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize);
  if (cursorCreatedAt && cursorId) query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`); const { data, error } = await query; const rows = (data ?? []) as unknown as SocialPost[]; const last = rows[rows.length - 1]; const nextCursor = rows.length === pageSize && last ? `${last.created_at}|${last.id}` : null; return { data: rows, nextCursor, hasMore: Boolean(nextCursor), error };
}