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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !publishableKey) return json({ error: "Server is not configured" }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { postId?: string; paths?: string[]; latitude?: number; longitude?: number; radiusMeters?: number };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const postId = typeof body.postId === "string" ? body.postId : "";
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string").slice(0, 10) : [];
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radiusMeters = Math.min(Math.max(Number(body.radiusMeters) || 5000, 500), 25000);
  if (!postId || !paths.length || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return json({ error: "Missing media authorization parameters" }, 400);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return json({ error: "Invalid coordinates" }, 400);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: authorizationError } = await service.rpc("can_access_nearby_post_media", {
    target_user_id: user.id,
    target_post_id: postId,
    latitude,
    longitude,
    radius_meters: radiusMeters,
  });
  if (authorizationError || allowed !== true) return json({ error: "Post media is outside your authorized discovery area" }, 403);

  const { data: mediaRows, error: mediaError } = await service
    .from("post_media")
    .select("storage_path")
    .eq("post_id", postId)
    .in("storage_path", paths);
  if (mediaError) return json({ error: "Unable to authorize media" }, 500);
  const authorizedPaths = new Set((mediaRows ?? []).map((row) => row.storage_path));
  if (authorizedPaths.size !== paths.length) return json({ error: "One or more media paths are not attached to this post" }, 403);

  const results: Record<string, string> = {};
  for (const path of paths) {
    const { data, error } = await service.storage.from("local-radar-media").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) return json({ error: "Unable to create media URL" }, 502);
    results[path] = data.signedUrl;
  }
  return json({ urls: results });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
