// Computes win/loss records per partnership pairing across a list of games
// — "am I better with Ryan or with Kevin" is exactly this. Pure function,
// no fetching, so it's directly testable and reusable regardless of where
// the games data came from.

export interface GameForStats {
  players: [string, string, string, string] | null;
  winner: "US" | "THEM" | null;
  status: "in_progress" | "completed" | "cancelled";
}

export interface PartnershipRecord {
  /** Two player names, alphabetically sorted so "Jon & Ryan" and
   * "Ryan & Jon" are always the same key regardless of which seat each
   * played that game. */
  players: [string, string];
  gamesPlayed: number;
  wins: number;
  losses: number;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort((x, y) => x.localeCompare(y)).join("\u0000");
}

export function computePartnershipStats(games: GameForStats[]): PartnershipRecord[] {
  const records = new Map<string, PartnershipRecord>();

  const record = (a: string, b: string): PartnershipRecord => {
    const key = pairKey(a, b);
    let r = records.get(key);
    if (!r) {
      const [p1, p2] = key.split("\u0000") as [string, string];
      r = { players: [p1, p2], gamesPlayed: 0, wins: 0, losses: 0 };
      records.set(key, r);
    }
    return r;
  };

  for (const game of games) {
    if (game.status !== "completed" || !game.players || !game.winner) continue;
    const [north, east, south, west] = game.players;

    const nsWon = game.winner === "US";
    const ns = record(north, south);
    ns.gamesPlayed++;
    if (nsWon) ns.wins++;
    else ns.losses++;

    const ew = record(east, west);
    ew.gamesPlayed++;
    if (!nsWon) ew.wins++;
    else ew.losses++;
  }

  return Array.from(records.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}
