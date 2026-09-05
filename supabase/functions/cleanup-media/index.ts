import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "local-radar-media";
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 20;

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const token = req.headers.get("x-media-cleanup-token");
  if (!token) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: authorized, error: authorizationError } = await service.rpc(
    "authorize_media_cleanup",
    { p_token: token },
  );

  if (authorizationError || authorized !== true) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: jobs, error: loadError } = await service
    .from("media_cleanup_queue")
    .select("id, bucket_id, storage_path, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (loadError) {
    return Response.json({ ok: false, error: loadError.message }, { status: 500 });
  }

  if (!jobs?.length) {
    return Response.json({ ok: true, processed: 0, failed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const job of jobs as Array<{ id: string; bucket_id: string; storage_path: string; attempts: number }>) {
    const attempts = Number(job.attempts ?? 0) + 1;

    if (job.bucket_id !== BUCKET || !job.storage_path) {
      await service
        .from("media_cleanup_queue")
        .update({
          status: "failed",
          attempts,
          last_error: "Unsupported media bucket or empty storage path",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      failed += 1;
      continue;
    }

    const { error: removeError } = await service.storage
      .from(job.bucket_id)
      .remove([job.storage_path]);

    if (!removeError) {
      await service
        .from("media_cleanup_queue")
        .update({
          status: "completed",
          attempts,
          completed_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      processed += 1;
      continue;
    }

    const permanentlyFailed = attempts >= MAX_ATTEMPTS;
    const backoffMinutes = Math.min(60, Math.max(1, 2 ** Math.min(attempts - 1, 6)));

    await service
      .from("media_cleanup_queue")
      .update({
        status: permanentlyFailed ? "failed" : "pending",
        attempts,
        next_attempt_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
        last_error: removeError.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    failed += 1;
  }

  return Response.json({ ok: failed === 0, processed, failed });
});
