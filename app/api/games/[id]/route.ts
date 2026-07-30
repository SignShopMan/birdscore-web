import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { roundsToDbRows, dbRowsToRounds, fetchSeatToPlayerId } from "@/lib/game-persistence";

/**
 * PATCH re-syncs an existing game's rounds and/or marks it completed.
 * Rather than diffing round-by-round, this replaces all rounds for the
 * game in one delete+insert — simple and correct, and cheap at the round
 * counts a real Rook game actually has (dozens at most).
 *
 * Players are NOT touched here — they're a one-time thing set at game
 * creation (POST /api/games), not editable mid-game, same as real Rook
 * (you don't swap players partway through a hand). PATCH just resolves
 * dealer/rook-holder against whichever players already exist.
 *
 * GET fetches one game with full round + player detail — used by
 * AccountScreen/HistoryScreen's Resume action and the partner-pairing
 * stats on the History page.
 *
 * RLS on games/rounds/players (see supabase/migrations/0001_init.sql)
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
  const { rounds, winner, settings, cancel } = body as {
    rounds?: Parameters<typeof roundsToDbRows>[1];
    winner?: "US" | "THEM" | null;
    settings?: {
      winningScore: number;
      maxPointsPerRound: number;
      usTeamName: string;
      themTeamName: string;
    };
    cancel?: boolean;
  };

  // Cancelling is a separate, minimal path — leaves whatever rounds already
  // exist untouched (they're still a real historical record of what was
  // played), just flips status. Doesn't touch anything else in the body.
  if (cancel) {
    const { error } = await supabase
      .from("games")
      .update({ status: "cancelled" })
      .eq("id", params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!rounds) {
    return NextResponse.json({ error: "rounds is required unless cancel is true" }, { status: 400 });
  }

  const { error: deleteError } = await supabase.from("rounds").delete().eq("game_id", params.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (rounds.length > 0) {
    const seatToPlayerId = await fetchSeatToPlayerId(supabase, params.id);
    const { error: insertError } = await supabase
      .from("rounds")
      .insert(roundsToDbRows(params.id, rounds, seatToPlayerId));
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

  const { data: players } = await supabase
    .from("players")
    .select("id, seat, display_name")
    .eq("game_id", params.id)
    .order("seat", { ascending: true });

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select(
      "id, round_number, row_type, us_score, them_score, trump, bid_team, bid, dealer_index, shoot_moon, label, rook_holder_player_id, created_at"
    )
    .eq("game_id", params.id)
    .order("created_at", { ascending: true });

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const playerIdToSeat = new Map((players ?? []).map((p) => [p.id, p.seat]));
  const playerNames =
    players && players.length === 4
      ? (players
          .sort((a, b) => a.seat - b.seat)
          .map((p) => p.display_name) as [string, string, string, string])
      : null;

  return NextResponse.json({
    game: {
      id: game.id,
      winningScore: game.winning_score,
      maxPointsPerRound: game.max_points_per_round,
      usTeamName: game.us_team_name,
      themTeamName: game.them_team_name,
      status: game.status,
      winner: game.winner,
      players: playerNames,
    },
    rounds: dbRowsToRounds(rounds ?? [], playerIdToSeat),
  });
}

/**
 * Permanently deletes a game — scoped to cancelled games only, on
 * purpose. A cancelled game has no real historical value, but a
 * completed (or even in-progress) one might, so this refuses to delete
 * anything else rather than trusting the client to only ever call it in
 * the right place. RLS also means this can only ever touch the caller's
 * own game regardless. rounds/players cascade-delete automatically
 * (on delete cascade in 0001_init.sql).
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: game } = await supabase
    .from("games")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled games can be permanently deleted" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("games").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
