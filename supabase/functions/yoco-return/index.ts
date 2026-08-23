import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_SCHEME = Deno.env.get("LEKKA_APP_SCHEME") ?? "manuslocalradarsa";

Deno.serve((req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order_id");
  const result = url.searchParams.get("result") ?? (url.pathname.endsWith("/cancel") ? "cancel" : url.pathname.endsWith("/failure") ? "failure" : "success");
  const target = new URL(`${APP_SCHEME}://payment/${result}`);
  if (orderId) target.searchParams.set("order_id", orderId);
  return new Response(null, { status: 302, headers: { Location: target.toString() } });
});
