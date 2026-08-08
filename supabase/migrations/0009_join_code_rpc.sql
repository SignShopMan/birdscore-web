-- Replaces the 0006 "anyone can check a join code exists" SELECT policy,
-- which had a real bug: RLS filters ROWS, not the shape of the query a
-- client happens to send. `using (is_realtime = true)` with no
-- requirement that the query is scoped to a specific code meant ANY
-- unfiltered select against `games` — trivial to send directly against
-- Supabase's REST endpoint with just the public anon key — returned every
-- pro-hosted game ever created: id, owner_id, join_code, team names,
-- status, winner. The app's own client always added `.eq("join_code",
-- ...)`, but nothing in the policy itself enforced that. 0006's own
-- comment claiming this was "scoped narrowly" and "doesn't let anyone
-- enumerate codes" was simply wrong about how RLS works.
--
-- Fixed the same way this codebase already handles "run trusted logic
-- server-side, return only what the caller actually needs" — a security
-- definer function, same pattern as handle_new_user() in 0001_init.sql.
-- This returns a single boolean, never a row, so there's nothing to leak
-- regardless of how the caller queries it.

drop policy "games: anyone can check a join code exists" on public.games;

create function public.check_join_code(code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.games
    where join_code = code and is_realtime = true
  );
$$;

grant execute on function public.check_join_code(text) to anon, authenticated;
