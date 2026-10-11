-- Payment order creation and checkout attachment must only be callable by the
-- trusted Edge Function after it has verified the Supabase user and created a
-- checkout with Yoco. Client callers must not choose prices or attach arbitrary IDs.

CREATE OR REPLACE FUNCTION public.create_yoco_payment_order_server(
  p_user_id uuid,
  p_business_id uuid,
  p_purpose text,
  p_reference_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.payment_orders;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_purpose <> 'verification' OR p_business_id IS NULL OR p_reference_id IS NULL THEN
    RAISE EXCEPTION 'invalid_payment_request';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = p_user_id
      AND bm.role IN ('owner', 'admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'not_business_manager';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.business_verification_requests vr
    WHERE vr.id = p_reference_id
      AND vr.business_id = p_business_id
      AND vr.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'verification_request_not_pending';
  END IF;

  INSERT INTO public.payment_orders(
    user_id, business_id, purpose, reference_id, amount_cents, idempotency_key, metadata
  )
  VALUES (
    p_user_id, p_business_id, 'verification', p_reference_id, 20000,
    extensions.gen_random_uuid()::text,
    pg_catalog.coalesce(p_metadata, '{}'::jsonb) || pg_catalog.jsonb_build_object(
      'environment', 'test',
      'user_id', p_user_id
    )
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.attach_yoco_checkout_server(
  p_order_id uuid,
  p_checkout_id text,
  p_user_id uuid
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.payment_orders;
BEGIN
  IF p_order_id IS NULL OR p_user_id IS NULL
     OR p_checkout_id IS NULL OR pg_catalog.btrim(p_checkout_id) = '' THEN
    RAISE EXCEPTION 'invalid_checkout_attachment';
  END IF;

  UPDATE public.payment_orders
  SET provider_checkout_id = p_checkout_id,
      updated_at = pg_catalog.now()
  WHERE id = p_order_id
    AND user_id = p_user_id
    AND status = 'pending'
    AND (provider_checkout_id IS NULL OR provider_checkout_id = p_checkout_id)
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'payment_order_not_found_or_not_pending';
  END IF;

  RETURN v_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_yoco_payment_order(uuid, text, uuid, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_yoco_payment_order(uuid, text, uuid, integer, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.attach_yoco_checkout(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_yoco_checkout(uuid, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.create_yoco_payment_order_server(uuid, uuid, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_yoco_payment_order_server(uuid, uuid, text, uuid, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.attach_yoco_checkout_server(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_yoco_checkout_server(uuid, text, uuid)
  TO service_role;
