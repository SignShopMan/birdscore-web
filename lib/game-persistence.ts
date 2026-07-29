import { Round, seatTeam } from "@/lib/rook-engine";

export interface DbRoundRow {
  game_id: string;
  round_number: number;
  row_type: "Round" | "Adj";
  us_score: number;
  them_score: number;
  trump: string | null;
  bid_team: string | null;
  bid: number | null;
  dealer_index: number | null;
  shoot_moon: boolean | null;
  label: string | null;
  dealer_player_id: string | null;
  rook_holder_player_id: string | null;
}

/** Seat (0-3) -> that seat's players.id row, for resolving dealer_player_id /
 * rook_holder_player_id. Only meaningful for games using named players —
 * pass null/omit when a game doesn't use them (the simple US/THEM flow). */
export type SeatToPlayerId = Map<number, string>;

export function roundsToDbRows(
  gameId: string,
  rounds: Round[],
  seatToPlayerId?: SeatToPlayerId
): DbRoundRow[] {
  return rounds.map((r) => ({
    game_id: gameId,
    round_number: r.round,
    row_type: r.rowType,
    us_score: r.usScore,
    them_score: r.themScore,
    trump: r.trump ?? null,
    bid_team: r.bidTeam ?? null,
    bid: r.bid ?? null,
    dealer_index: r.dealerIndex ?? null,
    shoot_moon: r.shootMoon ?? null,
    label: r.label ?? null,
    dealer_player_id:
      r.dealerIndex != null ? seatToPlayerId?.get(r.dealerIndex) ?? null : null,
    rook_holder_player_id:
      r.rookHolderSeat != null ? seatToPlayerId?.get(r.rookHolderSeat) ?? null : null,
  }));
}

/** Inverse of roundsToDbRows — used to hydrate a saved game back into the
 * client's game store (Resume) or to display full round detail. Takes an
 * optional playerIdToSeat map (the reverse of SeatToPlayerId) to recover
 * rookHolderSeat from the stored player reference. */
export function dbRowsToRounds(
  rows: Array<{
    id: string;
    round_number: number;
    row_type: "Round" | "Adj";
    us_score: number;
    them_score: number;
    trump: string | null;
    bid_team: string | null;
    bid: number | null;
    dealer_index: number | null;
    shoot_moon: boolean | null;
    label: string | null;
    rook_holder_player_id?: string | null;
    created_at: string;
  }>,
  playerIdToSeat?: Map<string, number>
): Round[] {
  return rows.map((r) => ({
    rowId: r.id,
    round: r.round_number,
    rowType: r.row_type,
    usScore: r.us_score,
    themScore: r.them_score,
    trump: (r.trump ?? undefined) as Round["trump"],
    bidTeam: (r.bid_team ?? undefined) as Round["bidTeam"],
    bid: r.bid ?? undefined,
    dealerIndex: r.dealer_index ?? undefined,
    shootMoon: r.shoot_moon ?? undefined,
    label: r.label ?? undefined,
    rookHolderSeat:
      r.rook_holder_player_id && playerIdToSeat
        ? playerIdToSeat.get(r.rook_holder_player_id) ?? null
        : null,
    createdAt: r.created_at,
  }));
}

/** Creates the 4 player rows for a new game using named players — called
 * once, at game creation (POST /api/games). Players are a one-time setup,
 * not editable mid-game (matches the real thing: you don't swap players
 * partway through a hand), so nothing else ever needs to write to this
 * table. Returns a seat->id map ready for roundsToDbRows. */
export async function createPlayers(
  supabase: { from: (table: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  gameId: string,
  players: [string, string, string, string]
): Promise<SeatToPlayerId> {
  const { data, error } = await supabase
    .from("players")
    .insert(
      players.map((display_name, seat) => ({
        game_id: gameId,
        seat,
        team: seatTeam(seat),
        display_name,
      }))
    )
    .select("id, seat");

  if (error || !data) return new Map();
  return new Map(data.map((row: { id: string; seat: number }) => [row.seat, row.id]));
}

/** Fetches the existing seat->id map for a game that already has players —
 * used on subsequent syncs (PATCH) to resolve dealer/rook-holder without
 * re-creating player rows. */
export async function fetchSeatToPlayerId(
  supabase: { from: (table: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  gameId: string
): Promise<SeatToPlayerId> {
  const { data } = await supabase.from("players").select("id, seat").eq("game_id", gameId);
  if (!data) return new Map();
  return new Map(data.map((row: { id: string; seat: number }) => [row.seat, row.id]));
}
