-- Presence authorization for BirdScore's live-game channels — a new
-- migration rather than editing 0003_realtime_broadcast.sql, since
-- migrations are append-only once shipped (0003 may already be applied
-- against a real database by the time this is written).
--
-- Presence is the sibling to Broadcast used for "who's currently
-- connected" — powers the live viewer count on the host's Invite screen.
-- Same realtime.messages authorization table as Broadcast, different
-- extension value ('presence' instead of 'broadcast'), and deliberately
-- SYMMETRIC unlike the broadcast policies: viewers need to WRITE their own
-- presence (announcing "I'm watching"), not just read it, so both
-- directions are open to anon here — unlike broadcast where only the host
-- can send. Scoped the same way: only on a channel matching a real
-- is_realtime game, not a blanket grant.

create policy "game presence: anyone can see who's watching a live game"
on "realtime"."messages"
for select
to anon, authenticated
using (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.games
    where join_code = replace(realtime.topic(), 'game:', '')
      and is_realtime = true
  )
);

create policy "game presence: anyone can announce their own presence"
on "realtime"."messages"
for insert
to anon, authenticated
with check (
  realtime.messages.extension = 'presence'
  and exists (
    select 1 from public.games
    where join_code = replace(realtime.topic(), 'game:', '')
      and is_realtime = true
  )
);
