-- Lets a completed game be removed from the History list without
-- permanently deleting it (see app/api/games/[id]/route.ts PATCH) —
-- reversible, and doesn't touch Partner Performance stats since
-- computePartnershipStats reads the full unfiltered games list, not the
-- filtered/visible one.

alter table public.games
  add column hidden boolean not null default false;
