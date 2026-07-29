import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roundsToDbRows, dbRowsToRounds } from "@/lib/game-persistence";

/**
 * PATCH re-syncs an existing game's rounds and/or marks it completed.
 * Rather than diffing round-by-round, this replaces all rounds for the
 * game in one delete+insert — simple and correct, and cheap at the round
 * counts a real Rook game actually has (dozens at most).
 *
 * GET fetches one game with full round detail — used by AccountScreen's
 * Resume action to hydrate an in-progress game back into the local store.
 * RLS on both games and rounds (see supabase/migrations/0001_init.sql)
 * already scopes every query to the signed-in owner, so there's no
 * separate ownership check needed here beyond being signed in at all.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  const { rounds, winner, settings } = body as {
    rounds: Parameters<typeof roundsToDbRows>[1];
    winner?: "US" | "THEM" | null;
    settings?: {
      winningScore: number;
      maxPointsPerRound: number;
      usTeamName: string;
      themTeamName: string;
    };
  };

  const { error: deleteError } = await supabase.from("rounds").delete().eq("game_id", params.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (rounds.length > 0) {
    const { error: insertError } = await supabase
      .from("rounds")
      .insert(roundsToDbRows(params.id, rounds));
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const gameUpdate: Record<string, unknown> = {};
  if (winner !== undefined) {
    gameUpdate.status = winner ? "completed" : "in_progress";
    gameUpdate.winner = winner;
    gameUpdate.completed_at = winner ? new Date().toISOString() : null;
  }
  if (settings) {
    gameUpdate.winning_score = settings.winningScore;
    gameUpdate.max_points_per_round = settings.maxPointsPerRound;
    gameUpdate.us_team_name = settings.usTeamName;
    gameUpdate.them_team_name = settings.themTeamName;
  }

  if (Object.keys(gameUpdate).length > 0) {
    const { error: gameError } = await supabase
      .from("games")
      .update(gameUpdate)
      .eq("id", params.id);
    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, winning_score, max_points_per_round, us_team_name, them_team_name, status, winner")
    .eq("id", params.id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: gameError?.message ?? "Game not found" }, { status: 404 });
  }

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id, round_number, row_type, us_score, them_score, trump, bid_team, bid, dealer_index, shoot_moon, label, created_at")
    .eq("game_id", params.id)
    .order("created_at", { ascending: true });

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  return NextResponse.json({
    game: {
      id: game.id,
      winningScore: game.winning_score,
      maxPointsPerRound: game.max_points_per_round,
      usTeamName: game.us_team_name,
      themTeamName: game.them_team_name,
      status: game.status,
      winner: game.winner,
    },
    rounds: dbRowsToRounds(rounds ?? []),
  });
}
