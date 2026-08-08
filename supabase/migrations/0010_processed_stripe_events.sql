-- Idempotency guard for app/api/stripe-webhook/route.ts. The handlers
-- there are already idempotent by construction today (they set tier/
-- period-end to values derived from the current Stripe object, not
-- incrementing anything), so a replayed event is currently harmless — but
-- that's incidental, not guaranteed, and a future handler added to this
-- route could easily not have that property. This closes the gap
-- properly: event.id is inserted before an event is processed, and the
-- unique constraint below is the actual gate — a replayed/duplicate
-- delivery hits a conflict and is skipped before doing anything.
--
-- Zero RLS policies, same pattern as dev_config in 0007_dev_config.sql —
-- the only writer is the webhook route's service-role client, which
-- already bypasses RLS entirely; this table has no reason to be visible
-- to anon/authenticated at all.

create table public.processed_stripe_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
