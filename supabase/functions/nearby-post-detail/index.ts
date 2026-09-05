import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!url || !serviceKey || !publishableKey || !authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: { postId?: string; latitude?: number; longitude?: number; radiusMeters?: number };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const postId = typeof body.postId === "string" ? body.postId : "";
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radiusMeters = Math.min(Math.max(Number(body.radiusMeters) || 5000, 500), 25000);
  if (!postId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return json({ error: "Missing location authorization parameters" }, 400);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return json({ error: "Invalid coordinates" }, 400);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: allowedError } = await service.rpc("can_access_nearby_post_media", {
    target_user_id: user.id,
    target_post_id: postId,
    latitude,
    longitude,
    radius_meters: radiusMeters,
  });
  if (allowedError || allowed !== true) return json({ error: "This post is outside your authorized discovery area" }, 403);

  const { data: post, error: postError } = await service
    .from("posts")
    .select("id, author_id, kind, category, title, body, area, visibility, trust_score, created_at, approximate_location, profiles!posts_author_id_fkey(id, display_name, username, bio, profile_image_path, interests, home_area), post_media(id, storage_path, media_type, thumbnail_path, width, height, sort_order)")
    .eq("id", postId)
    .maybeSingle();
  if (postError || !post) return json({ error: "Post is no longer available" }, 404);

  const mediaUrls: Record<string, string> = {};
  for (const media of (post.post_media ?? [])) {
    const { data, error } = await service.storage.from("local-radar-media").createSignedUrl(media.storage_path, 60 * 60);
    if (!error && data?.signedUrl) mediaUrls[media.storage_path] = data.signedUrl;
  }
  return json({ data: { post, mediaUrls } });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
