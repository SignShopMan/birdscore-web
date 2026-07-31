-- Lets an anonymous spectator check whether a join code corresponds to a
-- real, currently-realtime game — needed to fix a real gap: the watch
-- page previously showed "Connected — Waiting for the host" for ANY
-- string typed in, including punctuation like "!!!!!!", because it only
-- checked whether the Realtime WebSocket transport subscribed
-- successfully (which happens for any topic name at all), never whether
-- the code meant anything. RLS on games was owner-only, so even a
-- correct existence check would have failed for every anonymous viewer.
--
-- Scoped narrowly: only rows with is_realtime = true are visible this
-- way, and only via a query already filtered to a specific join_code the
-- caller already has to know — this doesn't let anyone enumerate codes,
-- just confirms visibility for a lookup they've already scoped. This is
-- no more exposure than the broadcast channel itself already provides to
-- anyone holding the code (see 0003_realtime_broadcast.sql) — rounds and
-- players stay under their own stricter owner-only RLS, untouched by
-- this policy.

create policy "games: anyone can check a join code exists"
on public.games
for select
to anon, authenticated
using (is_realtime = true);
