-- Realtime Broadcast authorization for BirdScore's live-game channels.
--
-- Supabase's Realtime Authorization is enabled by default on current
-- projects — without an explicit RLS policy on realtime.messages, NO
-- client (not even the host) can join a Broadcast channel at all. This
-- isn't optional plumbing; skip this migration and realtime silently does
-- nothing.
--
-- Channel naming: `game:{join_code}`. Two policies, deliberately asymmetric:
--
-- * RECEIVE (select) is open to `anon` — this is what makes "no account
--   needed to watch" actually work. A truly unauthenticated browser using
--   just the publishable/anon key can subscribe. But it's not a blanket
--   "any topic" grant: the topic has to match a `games` row that's
--   actually marked is_realtime, so guessing an unused topic name gets
--   nothing. Knowing the join code is the authorization, same trust model
--   as a shared document link.
--
-- * SEND (insert) is restricted to `authenticated`, and further scoped to
--   the account that actually owns that game. Only the host can publish
--   state — matches the "one scorekeeper, source of truth" decision.
--   Viewers can listen but never write, enforced here, not just in the UI.

create policy "game broadcast: anyone can listen to a live game's channel"
on "realtime"."messages"
for select
to anon, authenticated
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1 from public.games
    where join_code = replace(realtime.topic(), 'game:', '')
      and is_realtime = true
  )
);

create policy "game broadcast: only the owning host can publish"
on "realtime"."messages"
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1 from public.games
    where join_code = replace(realtime.topic(), 'game:', '')
      and is_realtime = true
      and owner_id = auth.uid()
  )
);
