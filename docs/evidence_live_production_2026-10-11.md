# Live production evidence — 2026-10-11

Project: `local-radar-sa` (`vnitwsjidlurlwlpsmtf`), region `eu-west-1`, ACTIVE_HEALTHY, Postgres 17.6.

## Migration history

Live history extends through:

- `20261011082007` `restrict_postgis_metadata_client_access`
- `20261011192054` `verify_yoco_payment_amount_currency_20261011`
- `20261011192351` `lock_down_yoco_order_creation_20261011`
- `20261011192757` `fix_yoco_rpc_coalesce_20261011`
- `20261011195846` `restrict_postgis_metadata_rpc_and_table_writes`
- `20261011203402` `revoke_public_st_estimatedextent_execute_20261011`
- `20261011203434` `revoke_all_client_st_estimatedextent_privileges_20261011`

The repository branch still ends at the September 2026 migration set, so production/backend drift remains material.

## Deployed Edge Functions

Active Yoco-related functions include:

- `yoco-create-checkout` version 11, JWT required
- `yoco-create-checkout-v2` version 10, JWT required
- `yoco-webhook` version 12, JWT disabled
- `yoco-return` version 9, JWT disabled
- `yoco-webhook-subscription` version 12, JWT required

Other active functions include `cleanup-media` v4, `nearby-media` v1, and `nearby-post-detail` v1.

## Current security advisor findings

- `spatial_ref_sys` is public with RLS disabled.
- All three `public.st_estimatedextent` overloads remain executable by anonymous and authenticated roles as `SECURITY DEFINER` functions.
- Five tables have RLS enabled with no policies: `cape_aloe_order_items`, `cape_aloe_orders`, `cape_aloe_yoco_events`, `media_cleanup_queue`, and `yoco_webhook_events`.
- Leaked-password protection is disabled.
- Performance advisors report 39 auth-RLS init-plan findings, 58 multiple-permissive-policy findings, and 26 unused indexes.

The advisor output was read-only and no production mutation was performed.
