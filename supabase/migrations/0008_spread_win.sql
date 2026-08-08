-- "Win by spread" house rule (see GameSettings.spreadWin in
-- lib/rook-engine.ts): some tables end the game when the point GAP between
-- the two teams reaches the winning score, not just when either team's own
-- total does. Off by default so existing and in-progress games are
-- unaffected unless someone explicitly turns it on for a new game.
--
-- Persisted per-game (like winning_score/max_points_per_round already are)
-- rather than left client-only, so Resume reconstructs the same rule a
-- game was actually being played under instead of silently reverting to
-- the default the moment a game gets reloaded from Supabase.

alter table public.games
  add column spread_win boolean not null default false;
