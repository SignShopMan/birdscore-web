"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/game-store";
import { useAuthStore } from "@/lib/auth-store";
import { canSaveHistory } from "@/lib/entitlements";

/**
 * Keeps an entitled, signed-in account's game synced to Supabase as it's
 * played — not just at Game Over. This is what "in-progress games are
 * stored" actually requires: without this, nothing reached the database
 * until the very end, so a lost device mid-game meant a lost game even for
 * paying accounts.
 *
 * Fires after every meaningful local change (a round scored, an
 * adjustment, an edit, game over, or a settings/team-name edit) via the
 * rounds/gameOver/winner/settings dependencies. Sends the full current rounds array each time rather than
 * a diff — simple and correct at the round counts a real game has (dozens
 * at most), and self-healing: if one sync attempt gets skipped because a
 * previous one was still in flight, the next change re-sends the complete
 * up-to-date state anyway, so nothing is permanently lost, just possibly
 * delayed by one round in the rare overlap case.
 */
export function GameSync() {
  const {
    hasHydrated,
    settings,
    rounds,
    gameOver,
    winner,
    currentGameId,
    setCurrentGameId,
    setJoinCode,
    setSyncStatus,
  } = useGameStore();
  const { userId, tier } = useAuthStore();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || !userId || !canSaveHistory(tier)) return;
    if (rounds.length === 0 && !gameOver) return;
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncStatus("syncing");

    const run = async () => {
      try {
        if (!currentGameId) {
          const res = await fetch("/api/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings, rounds, winner: gameOver ? winner : null }),
          });
          if (!res.ok) throw new Error("create failed");
          const data = await res.json();
          setCurrentGameId(data.gameId);
          if (data.joinCode) setJoinCode(data.joinCode);
        } else {
          const res = await fetch(`/api/games/${currentGameId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings, rounds, winner: gameOver ? winner : null }),
          });
          if (!res.ok) throw new Error("update failed");
        }
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      } finally {
        syncingRef.current = false;
      }
    };
    run();
    // setCurrentGameId/setSyncStatus are stable — every other dependency is
    // a real trigger, including settings (team names/rules can be edited
    // mid-game via Settings "edit" mode and need to reach the saved copy).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, userId, tier, rounds, gameOver, winner, currentGameId, settings]);

  return null;
}
