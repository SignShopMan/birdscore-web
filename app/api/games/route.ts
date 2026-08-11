import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveTier, canSaveHistory, canHostRealtime } from "@/lib/entitlements";
import { roundsToDbRows, createPlayers } from "@/lib/game-persistence";
import { generateJoinCode } from "@/lib/join-code";

/**
 * POST creates a new game row. Used two ways: (1) the moment an entitled,
 * signed-in user starts a game — see lib/game-store.ts's Supabase sync —
 * so it exists as "in_progress" from the first round, not just at the end;
 * and (2) the Game Over "save this game" conversion path for someone who
 * just upgraded, saving what was held in memory (see SaveGamePrompt /
 * PendingSaveSync).
 *
 * GET lists the signed-in user's games, most recent first, with computed
 * running totals — the actual read side of history, which didn't exist
 * before this round (saving worked, nothing ever displayed it back).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, pro_current_period_end, email, dev_tier_override, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const tier = effectiveTier({
    tier: profile.tier,
    proCurrentPeriodEnd: profile.pro_current_period_end,
    email: profile.email,
    devTierOverride: profile.dev_tier_override,
    createdAt: profile.created_at,
  });
  if (!canSaveHistory(tier)) {
    return NextResponse.json(
      { error: "Saving game history requires the $3.99 tier or above" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { id, settings, rounds, winner } = body as {
    id?: string;
    settings: {
      winningScore: number;
      maxPointsPerRound: number;
      usTeamName: string;
      themTeamName: string;
      players: [string, string, string, string] | null;
      spreadWin: boolean;
    };
    rounds: Parameters<typeof roundsToDbRows>[1];
    winner: "US" | "THEM" | null;
  };

  // Pro tier gets an automatic join code — no separate "enable hosting"
  // step. Every pro-tier game is shareable by default; the code just sits
  // unused if nobody's watching.
  const isHost = canHostRealtime(tier);
  let game: { id: string; join_code: string | null } | null = null;
  let gameError: { message: string } | null = null;
  // True when `game` was found rather than freshly inserted this call —
  // players/rounds below must be skipped in that case, since a prior
  // attempt (or an in-flight concurrent one) already created them for this
  // same id and re-running would duplicate players/rounds rows instead of
  // duplicating the game row.
  let wasExisting = false;

  // `id` is a client-generated UUID (see GameSync.tsx) — this request may
  // be a retry of a create whose earlier response never reached the client
  // (app backgrounded/killed mid-request). If a row with this id already
  // exists for this owner, reuse it instead of inserting a duplicate row;
  // rounds/settings will catch up via the next PATCH either way.
  if (id) {
    const { data: existing } = await supabase
      .from("games")
      .select("id, join_code")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (existing) {
      game = existing;
      wasExisting = true;
    }
  }

  for (let attempt = 0; attempt < 3 && !game; attempt++) {
    const joinCode = isHost ? generateJoinCode() : null;
    const { data, error } = await supabase
      .from("games")
      .insert({
        ...(id ? { id } : {}),
        owner_id: user.id,
        winning_score: settings.winningScore,
        max_points_per_round: settings.maxPointsPerRound,
        us_team_name: settings.usTeamName ?? "Us",
        them_team_name: settings.themTeamName ?? "Them",
        spread_win: settings.spreadWin ?? false,
        status: winner ? "completed" : "in_progress",
        winner,
        completed_at: winner ? new Date().toISOString() : null,
        is_realtime: isHost,
        join_code: joinCode,
      })
      .select("id, join_code")
      .single();

    if (data) {
      game = data;
    } else if (error?.code === "23505") {
      // Could be a join_code collision (regenerate and retry) or a genuine
      // race on `id` itself (another in-flight retry already inserted it) —
      // check which before assuming.
      if (id) {
        const { data: existing } = await supabase
          .from("games")
          .select("id, join_code")
          .eq("id", id)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (existing) {
          game = existing;
          wasExisting = true;
          continue;
        }
      }
      if (attempt < 2) continue; // join_code collision (~1 in a billion) — regenerate and retry
      gameError = error;
    } else {
      gameError = error;
    }
  }

  if (!game) {
    return NextResponse.json({ error: gameError?.message ?? "Failed to save game" }, { status: 500 });
  }

  // Skip on a reused existing row — a prior attempt already created these
  // (or is doing so concurrently), and re-running would insert duplicate
  // players/rounds for the same game_id. The next PATCH naturally carries
  // forward whatever rounds/settings changed since.
  if (!wasExisting) {
    const seatToPlayerId = settings.players
      ? await createPlayers(supabase, game.id, settings.players)
      : undefined;

    if (rounds.length > 0) {
      const { error: roundsError } = await supabase
        .from("rounds")
        .insert(roundsToDbRows(game.id, rounds, seatToPlayerId));
      if (roundsError) {
        return NextResponse.json({ error: roundsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ gameId: game.id, joinCode: game.join_code });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data: games, error } = await supabase
    .from("games")
    .select(
      "id, winning_score, max_points_per_round, us_team_name, them_team_name, status, hidden, winner, created_at, completed_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!games || games.length === 0) {
    return NextResponse.json({ games: [] });
  }

  // One extra query for totals rather than N — fetch every round for every
  // listed game at once and sum client-side (in this route), instead of a
  // per-game round-trip. Also carries rook_holder_player_id — beta
  // feedback wanted a running Rook tally (who actually gets stuck with it
  // most), and the per-round holder was already tracked but never
  // aggregated anywhere.
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("game_id, us_score, them_score, rook_holder_player_id")
    .in("game_id", games.map((g) => g.id));

  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const totals = new Map<string, { us: number; them: number }>();
  for (const r of rounds ?? []) {
    const t = totals.get(r.game_id) ?? { us: 0, them: 0 };
    t.us += r.us_score;
    t.them += r.them_score;
    totals.set(r.game_id, t);
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, game_id, seat, display_name")
    .in(
      "game_id",
      games.map((g) => g.id)
    );
  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }
  const playersByGame = new Map<string, { seat: number; display_name: string }[]>();
  for (const p of players ?? []) {
    const list = playersByGame.get(p.game_id) ?? [];
    list.push({ seat: p.seat, display_name: p.display_name });
    playersByGame.set(p.game_id, list);
  }

  // Rook tally — by player name (not id, so the same person across
  // different games/seats still adds up) and by partnership pairing,
  // matching how "Partner Performance" already groups north+south /
  // east+west. Counted regardless of game status: an in-progress game's
  // rounds so far are real hands that were actually dealt, same reasoning
  // as why totals above aren't status-gated either.
  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.display_name]));
  const rookByPlayer = new Map<string, number>();
  const rookByPartnership = new Map<string, { players: [string, string]; count: number }>();
  for (const r of rounds ?? []) {
    if (!r.rook_holder_player_id) continue;
    const name = playerNameById.get(r.rook_holder_player_id);
    if (!name) continue;
    rookByPlayer.set(name, (rookByPlayer.get(name) ?? 0) + 1);

    const gamePlayers = playersByGame.get(r.game_id);
    if (!gamePlayers || gamePlayers.length !== 4) continue;
    // North+South (seats 0/2) and East+West (seats 1/3) are partners —
    // same pairing partner-stats.ts uses for "Partner Performance".
    const PARTNER_SEAT = [2, 3, 0, 1] as const;
    const holder = gamePlayers.find((p) => p.display_name === name);
    if (!holder) continue;
    const partnerPlayer = gamePlayers.find((p) => p.seat === PARTNER_SEAT[holder.seat]);
    if (!partnerPlayer) continue;
    const partner = partnerPlayer.display_name;
    const pairKey = [name, partner].sort().join(" ");
    const existing = rookByPartnership.get(pairKey);
    if (existing) existing.count++;
    else {
      const pair = [name, partner].sort() as [string, string];
      rookByPartnership.set(pairKey, { players: pair, count: 1 });
    }
  }
  const rookStats = {
    perPlayer: Array.from(rookByPlayer.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    perPartnership: Array.from(rookByPartnership.values()).sort((a, b) => b.count - a.count),
  };

  const result = games.map((g) => {
    const gamePlayers = playersByGame.get(g.id);
    const sortedPlayers =
      gamePlayers && gamePlayers.length === 4
        ? (gamePlayers.sort((a, b) => a.seat - b.seat).map((p) => p.display_name) as [
            string,
            string,
            string,
            string
          ])
        : null;
    return {
      id: g.id,
      winningScore: g.winning_score,
      maxPointsPerRound: g.max_points_per_round,
      usTeamName: g.us_team_name,
      themTeamName: g.them_team_name,
      hidden: g.hidden,
      status: g.status,
      winner: g.winner,
      createdAt: g.created_at,
      completedAt: g.completed_at,
      usTotal: totals.get(g.id)?.us ?? 0,
      themTotal: totals.get(g.id)?.them ?? 0,
      players: sortedPlayers,
    };
  });

  return NextResponse.json({ games: result, rookStats });
}
