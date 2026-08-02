-- A single-row table for Dev Stats' Resend/Vercel credentials, entered
-- through the app instead of Vercel's environment variable dashboard.
--
-- Deliberately has ZERO RLS policies, not even an anon/authenticated
-- read policy scoped to "yourself" — with RLS enabled and no policies at
-- all, Postgres denies every request from the anon/authenticated roles
-- by default, meaning the ONLY way to ever read or write this table is
-- the service-role client (lib/supabase/admin.ts), which already bypasses
-- RLS entirely. The API routes touching this table independently
-- re-check isDevStatsViewer before ever using that client — this table
-- has no awareness of who's asking, same pattern as every other
-- dev-only surface in this app.
--
-- These are real credentials (a Resend API key, a Vercel access token) —
-- not something to expose more broadly than this even by accident.

create table public.dev_config (
  id int primary key default 1,
  resend_api_key text,
  vercel_token text,
  vercel_project_id text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

alter table public.dev_config enable row level security;
