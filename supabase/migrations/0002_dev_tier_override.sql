-- Adds a dev-only tier override, kept as a separate column deliberately —
-- see lib/entitlements.ts for why this doesn't touch the real tier/
-- plus_purchased_at/pro_current_period_end columns that Stripe webhooks
-- write to. Enforcement that this only ever applies to one specific
-- account lives in application code (effectiveTier + the API route that
-- sets it), not in this migration — RLS already scopes writes to a
-- person's own row, but the email check is the real gate.

alter table public.profiles
  add column dev_tier_override text check (dev_tier_override in ('free', 'plus', 'pro'));
