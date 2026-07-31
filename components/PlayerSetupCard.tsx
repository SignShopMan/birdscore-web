"use client";

import { useAuthStore } from "@/lib/auth-store";
import { canUseNamedPlayers } from "@/lib/entitlements";

/**
 * Two modes, both $3.99 tier and up: simple custom team names (two text
 * fields, unchanged from before), or full 4-player tracking — who deals
 * first, their partner, and the other pair — which is what actually
 * enables dealer names during play and, later, partner-pairing stats on
 * the History page. Named players is opt-in per game, not forced: not
 * everyone wants to type 4 names before every game.
 */
export function PlayerSetupCard({
  useNamedPlayers,
  onToggleNamedPlayers,
  usTeamName,
  themTeamName,
  onChangeUs,
  onChangeThem,
  playerNames,
  onChangePlayer,
}: {
  useNamedPlayers: boolean;
  onToggleNamedPlayers: (v: boolean) => void;
  usTeamName: string;
  themTeamName: string;
  onChangeUs: (v: string) => void;
  onChangeThem: (v: string) => void;
  playerNames: [string, string, string, string];
  onChangePlayer: (seat: number, v: string) => void;
}) {
  const { tier } = useAuthStore();
  const entitled = canUseNamedPlayers(tier);

  if (!entitled) {
    return (
      <p className="font-body text-xs text-ink/70">
        Custom team names and named players are part of the $3.99 one-time tier — sign in from
        the menu to unlock them. Games play as &ldquo;Us&rdquo; and &ldquo;Them&rdquo; until then.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => onToggleNamedPlayers(false)}
          className={`flex-1 rounded-full py-1.5 font-body text-xs font-semibold uppercase tracking-wide ${
            !useNamedPlayers ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Team names only
        </button>
        <button
          onClick={() => onToggleNamedPlayers(true)}
          className={`flex-1 rounded-full py-1.5 font-body text-xs font-semibold uppercase tracking-wide ${
            useNamedPlayers ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-ink/20"
          }`}
        >
          Track 4 players
        </button>
      </div>

      {!useNamedPlayers ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs font-semibold text-ink/70">Us</label>
            <input
              type="text"
              value={usTeamName}
              maxLength={24}
              onChange={(e) => onChangeUs(e.target.value)}
              placeholder="Us"
              className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
            />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-ink/70">Them</label>
            <input
              type="text"
              value={themTeamName}
              maxLength={24}
              onChange={(e) => onChangeThem(e.target.value)}
              placeholder="Them"
              className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
            />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="font-body text-xs text-ink/60">
            Partners sit across from each other, not next to each other — same as a real
            table. Dealing goes in this order, looping back to the first dealer.
          </p>
          <div className="mt-3 space-y-2">
            {[
              { seat: 0, label: "First dealer" },
              { seat: 1, label: "Second dealer" },
              { seat: 2, label: "First dealer\u2019s partner" },
              { seat: 3, label: "Second dealer\u2019s partner" },
            ].map(({ seat, label }) => (
              <div key={seat}>
                <label className="font-body text-xs font-semibold text-ink/70">{label}</label>
                <input
                  type="text"
                  value={playerNames[seat]}
                  maxLength={24}
                  onChange={(e) => onChangePlayer(seat, e.target.value)}
                  placeholder={label}
                  className="mt-1 w-full rounded-md border border-ink/20 bg-white px-3 py-2 font-body text-sm text-ink"
                />
              </div>
            ))}
          </div>
          {playerNames.every((n) => n.trim()) && (
            <p className="mt-3 rounded-md bg-white p-2 font-body text-xs text-ink/70">
              Teams:{" "}
              <span className="font-semibold text-ink">
                {playerNames[0]} &amp; {playerNames[2]}
              </span>{" "}
              vs.{" "}
              <span className="font-semibold text-ink">
                {playerNames[1]} &amp; {playerNames[3]}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
