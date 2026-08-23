import { supabase } from "@/lib/supabase";

export type YocoCheckoutResult = {
  orderId: string;
  checkoutId: string;
  redirectUrl: string;
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

export async function getPaymentOrder(orderId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  return supabase
    .from("payment_orders")
    .select("id,status,purpose,amount_cents,currency,provider_checkout_id,provider_payment_id,paid_at,created_at,updated_at")
    .eq("id", orderId)
    .maybeSingle();
}
