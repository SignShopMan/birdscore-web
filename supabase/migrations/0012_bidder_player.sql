-- Which named player actually won the bid, not just which team —
-- lets the scorekeeper pick the winning player directly (pass/pass/pass
-- down to one remaining) instead of a separate team pick that could
-- disagree with it. Nullable and only ever populated for pro-tier games
-- with named players, same pattern as dealer_player_id and
-- rook_holder_player_id in 0001_init.sql.

alter table public.rounds
  add column if not exists bidder_player_id uuid references public.players(id);
