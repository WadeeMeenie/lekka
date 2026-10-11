-- A signed webhook proves origin, but the application must still correlate the
-- checkout and verify the amount/currency before marking an order paid.
CREATE OR REPLACE FUNCTION public.set_payment_order_status_from_yoco_verified(
  p_checkout_id text,
  p_status text,
  p_provider_payment_id text,
  p_metadata jsonb,
  p_amount_cents integer,
  p_currency text
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.payment_orders;
BEGIN
  IF p_status NOT IN ('paid', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'invalid_provider_status';
  END IF;

  IF p_checkout_id IS NULL OR pg_catalog.btrim(p_checkout_id) = '' THEN
    RAISE EXCEPTION 'missing_checkout_id';
  END IF;

  IF p_status = 'paid' AND (
    p_amount_cents IS NULL
    OR p_currency IS NULL
    OR pg_catalog.upper(p_currency) <> 'ZAR'
  ) THEN
    RAISE EXCEPTION 'invalid_payment_amount_or_currency';
  END IF;

  UPDATE public.payment_orders
  SET status = p_status,
      provider_payment_id = pg_catalog.coalesce(p_provider_payment_id, provider_payment_id),
      metadata = metadata || pg_catalog.coalesce(p_metadata, '{}'::jsonb),
      paid_at = CASE WHEN p_status = 'paid' THEN pg_catalog.coalesce(paid_at, pg_catalog.now()) ELSE paid_at END,
      updated_at = pg_catalog.now()
  WHERE provider_checkout_id = p_checkout_id
    AND (
      p_status <> 'paid'
      OR (amount_cents = p_amount_cents AND pg_catalog.upper(currency) = pg_catalog.upper(p_currency))
    )
    AND (
      status = p_status
      OR (status = 'pending' AND p_status IN ('paid', 'failed'))
      OR (status = 'paid' AND p_status = 'refunded')
    )
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'payment_order_not_found_or_amount_mismatch';
  END IF;

  RETURN v_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_payment_order_status_from_yoco_verified(text, text, text, jsonb, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_payment_order_status_from_yoco_verified(text, text, text, jsonb, integer, text)
  TO service_role;
