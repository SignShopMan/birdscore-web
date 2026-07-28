-- BirdScore Phase 2 foundation schema.
-- Run this in the Supabase SQL Editor (or via `supabase db push` once the
-- CLI is linked) against a fresh project.
--
-- Design notes, since these were real decisions, not defaults:
--
-- * Free-tier play never touches this schema at all — it's fully local/
--   in-memory in the browser, same as today. Nothing here is a gate in
--   front of basic play; it's what the $3.99/$19.99 tiers unlock.
--
-- * Realtime *viewers* never query these tables either, even read-only.
--   They subscribe to a Supabase Realtime Broadcast channel keyed by
--   join_code — pure pub/sub, no database row, no RLS needed for them.
--   That's what makes free/no-account viewing possible: the tables below
--   are exclusively for the host's own persistence.
--
-- * "players" exists starting at the $3.99 tier (named players, team
--   names), not deferred to the $19.99 tier — only the *extra stat
--   columns* on rounds (dealer, rook holder) are $19.99-exclusive.

create extension if not exists "pgcrypto";

-- One row per authenticated user. Created by a trigger on auth.users below.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro')),
  plus_purchased_at timestamptz,
  -- null when not currently pro, or when a pro subscription has lapsed.
  -- On lapse, tier drops to 'plus' (if they'd ever paid the one-time price
  -- OR previously held pro — see the annual-lapse policy) rather than
  -- 'free', so a missed renewal never deletes anything already paid for.
  pro_current_period_end timestamptz,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- One row per saved game. is_realtime + join_code are set when a pro-tier
-- host starts a live session; join_code is what viewers use to find the
-- Broadcast channel (never used for a table read, see notes above).
create table public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  winning_score int not null,
  max_points_per_round int not null,
  us_team_name text not null default 'Us',
  them_team_name text not null default 'Them',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  winner text check (winner in ('US', 'THEM')),
  is_realtime boolean not null default false,
  join_code text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.games enable row level security;

create policy "games: owner full access"
  on public.games for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index games_owner_id_idx on public.games (owner_id);

-- Named players per game — $3.99 tier and up. Seat 0/1 = US, 2/3 = THEM by
-- convention, matching the dealer-rotation seats already in the app.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team text not null check (team in ('US', 'THEM')),
  seat int not null check (seat between 0 and 3),
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (game_id, seat)
);

alter table public.players enable row level security;

create policy "players: access via owned game"
  on public.players for all
  using (game_id in (select id from public.games where owner_id = auth.uid()))
  with check (game_id in (select id from public.games where owner_id = auth.uid()));

-- Mirrors lib/rook-engine.ts's Round type exactly — including the "Adj"
-- (penalty/bonus) row type from the beta feedback rounds. dealer_player_id
-- and rook_holder_player_id are nullable and only ever populated for
-- pro-tier games with named players; a plus-tier game's rounds simply
-- leave them null.
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  round_number int not null,
  row_type text not null check (row_type in ('Round', 'Adj')),
  us_score int not null,
  them_score int not null,
  trump text check (trump in ('Black', 'Green', 'Red', 'Yellow')),
  bid_team text check (bid_team in ('US', 'THEM')),
  bid int,
  dealer_index int,
  shoot_moon boolean,
  label text,
  dealer_player_id uuid references public.players(id),
  rook_holder_player_id uuid references public.players(id),
  created_at timestamptz not null default now()
);

alter table public.rounds enable row level security;

create policy "rounds: access via owned game"
  on public.rounds for all
  using (game_id in (select id from public.games where owner_id = auth.uid()))
  with check (game_id in (select id from public.games where owner_id = auth.uid()));

create index rounds_game_id_idx on public.rounds (game_id);
