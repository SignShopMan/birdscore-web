-- Adds a "cancelled" status so orphaned/abandoned games can actually be
-- cleaned up instead of sitting as "in_progress" forever. Postgres check
-- constraints can't be altered in place — drop and recreate.

alter table public.games drop constraint games_status_check;
alter table public.games
  add constraint games_status_check check (status in ('in_progress', 'completed', 'cancelled'));
