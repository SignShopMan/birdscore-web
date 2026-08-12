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
  const { rounds, winner, settings, cancel, hidden } = body as {
    rounds?: Parameters<typeof roundsToDbRows>[1];
    winner?: "US" | "THEM" | null;
    settings?: {
      winningScore: number;
      maxPointsPerRound: number;
      usTeamName: string;
      themTeamName: string;
      spreadWin: boolean;
    };
    cancel?: boolean;
    hidden?: boolean;
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

  // Hide/unhide a completed game — reversible, doesn't touch rounds or
  // stats (Partner Performance reads the full unfiltered games list, not
  // whatever's currently visible), just whether it shows up in History.
  if (hidden !== undefined) {
    const { error } = await supabase.from("games").update({ hidden }).eq("id", params.id);
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
    if (winner) {
      // Every round scored triggers a full resync (see GameSync.tsx), so
      // this runs again on every subsequent sync of an already-completed
      // game — a stale local session reconnecting days later, or a
      // historical-round edit after the fact. Preserve the completed_at
      // that's already there rather than bumping it to now() each time;
      // only a genuinely first-time completion (no existing completed_at)
      // gets stamped with the current time.
      const { data: existingGame } = await supabase
        .from("games")
        .select("completed_at")
        .eq("id", params.id)
        .single();
      gameUpdate.completed_at = existingGame?.completed_at ?? new Date().toISOString();
    } else {
      gameUpdate.completed_at = null;
    }
  }
  if (settings) {
    gameUpdate.winning_score = settings.winningScore;
    gameUpdate.max_points_per_round = settings.maxPointsPerRound;
    gameUpdate.us_team_name = settings.usTeamName;
    gameUpdate.them_team_name = settings.themTeamName;
    gameUpdate.spread_win = settings.spreadWin;
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
    .select(
      "id, winning_score, max_points_per_round, us_team_name, them_team_name, spread_win, status, winner, created_at, completed_at"
    )
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
      "id, round_number, row_type, us_score, them_score, trump, bid_team, bid, dealer_index, shoot_moon, label, rook_holder_player_id, bidder_player_id, created_at"
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
      spreadWin: game.spread_win,
      status: game.status,
      winner: game.winner,
      players: playerNames,
      createdAt: game.created_at,
      completedAt: game.completed_at,
    },
    rounds: dbRowsToRounds(rounds ?? [], playerIdToSeat),
  });
}

/**
 * Permanently deletes a game — scoped to cancelled or completed games
 * only. In-progress is deliberately excluded: the client always cancels
 * an in-progress game first (PATCH cancel:true), which flips it to
 * cancelled before this is ever called, so there's no legitimate path
 * that reaches here with status still "in_progress" — refusing it here
 * too is a real safety rail, not just an unreachable branch, since it
 * means a client bug can't skip straight to deleting a game that's still
 * being played. RLS also means this can only ever touch the caller's own
 * game regardless. rounds/players cascade-delete automatically (on delete
 * cascade in 0001_init.sql).
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
  if (game.status !== "cancelled" && game.status !== "completed") {
    return NextResponse.json(
      { error: "Only cancelled or completed games can be permanently deleted" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("games").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
