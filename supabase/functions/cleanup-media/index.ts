import { withSupabase } from "npm:@supabase/server@^1";

const BUCKET = "local-radar-media";
const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 20;

export default {
  fetch: withSupabase({ auth: "publishable" }, async (_req, ctx) => {
    const { data: jobs, error: loadError } = await ctx.supabaseAdmin
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
        await ctx.supabaseAdmin
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

      const { error: removeError } = await ctx.supabaseAdmin.storage
        .from(job.bucket_id)
        .remove([job.storage_path]);

      if (!removeError) {
        await ctx.supabaseAdmin
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

      await ctx.supabaseAdmin
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
  }),
};
