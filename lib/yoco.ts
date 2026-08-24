import { supabase } from "@/lib/supabase";

export type YocoCheckoutResult = {
  orderId: string;
  checkoutId: string;
  redirectUrl: string;
};

export type YocoWebhookSubscriptionResult = {
  subscriptionId: string;
  notificationUrl: string;
  eventTypes: string[];
  secret: string | null;
  alreadyExists?: boolean;
  status?: string;
  environment?: string;
};

/** The single client entry point for Lekka's Yoco checkout flow. */
export async function createYocoVerificationCheckout(businessId: string, verificationRequestId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data, error } = await supabase.functions.invoke("yoco-create-checkout", {
    body: { businessId, purpose: "verification", referenceId: verificationRequestId },
  });
  if (error) return { data: null, error };
  if (!data?.redirectUrl || !data?.orderId || !data?.checkoutId) {
    return { data: null, error: new Error("Yoco did not return a valid checkout") };
  }
  return { data: data as YocoCheckoutResult, error: null };
}

/**
 * Creates the single Yoco TEST webhook subscription using the current authenticated
 * Supabase session. The Edge Function performs the authoritative platform-admin check.
 * The returned secret is intentionally returned only to the caller so an admin can
 * configure YOCO_WEBHOOK_SECRET manually; it is never persisted or logged here.
 */
export async function createYocoTestWebhookSubscription() {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    return { data: null, error: sessionError ?? new Error("You must be signed in") };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin", {
    target_user: sessionData.session.user.id,
  });
  if (adminError) return { data: null, error: adminError };
  if (!isAdmin) return { data: null, error: new Error("Platform admin access required") };

  const { data, error } = await supabase.functions.invoke("yoco-webhook-subscription", {
    body: {},
  });
  if (error) return { data: null, error };
  if (!data?.subscriptionId) {
    return { data: null, error: new Error("Yoco did not return a subscription ID") };
  }

  return {
    data: data as YocoWebhookSubscriptionResult,
    error: null,
  };
}

export async function getPaymentOrder(orderId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase
    .from("payment_orders")
    .select("id,status,purpose,amount_cents,currency,provider_checkout_id,provider_payment_id,paid_at,created_at,updated_at")
    .eq("id", orderId)
    .maybeSingle();
}
