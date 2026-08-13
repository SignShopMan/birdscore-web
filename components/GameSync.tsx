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
 * Fires the moment a game becomes active (Start Game / New Game / Resume —
 * see gameActive in game-store.ts), not just once a round is scored. That
 * distinction matters specifically for pro-tier hosts: the join code is
 * assigned on this same first sync, so gating on "at least one round
 * played" meant the invite code didn't exist until after the first round
 * — backwards from how you'd actually want to share it. Also fires after
 * every subsequent meaningful change (a round scored, an adjustment, an
 * edit, game over, or a settings/team-name edit) via the
 * rounds/gameOver/winner/settings dependencies. Sends the full current
 * rounds array each time rather than a diff — simple and correct at the
 * round counts a real game has (dozens at most), and self-healing: if one
 * sync attempt gets skipped because a previous one was still in flight,
 * the next change re-sends the complete up-to-date state anyway, so
 * nothing is permanently lost, just possibly delayed by one round in the
 * rare overlap case.
 *
 * The create step specifically (first sync of a new game) is idempotent by
 * construction: currentGameId is a UUID generated client-side the instant
 * Start Game is pressed (see game-store.ts's startGame), not assigned by
 * the server on response. gameCreated tracks whether that id has actually
 * been persisted yet. If the create request never completes client-side
 * (app backgrounded or killed mid-request, connection drops before the
 * response arrives), gameCreated stays false and currentGameId is
 * unchanged, so the next sync attempt retries POST with that same id —
 * the server recognizes it already exists and returns it rather than
 * inserting a second row. Previously currentGameId itself started null and
 * was only set from the server's response, so a lost response meant the
 * next attempt had no way to know a row might already exist and created a
 * duplicate — the source of the duplicate-game-in-History bug.
 */
export function GameSync() {
  const {
    hasHydrated,
    gameActive,
    settings,
    rounds,
    gameOver,
    winner,
    currentGameId,
    gameCreated,
    setGameCreated,
    setJoinCode,
    setSyncStatus,
  } = useGameStore();
  const { userId, tier } = useAuthStore();
  const syncingRef = useRef(false);
  // Always holds the current attempt, reassigned every render — lets the
  // 'online' listener below call the up-to-date version without needing
  // this whole dependency list a second time (see that effect).
  const attemptSyncRef = useRef<() => void>(() => {});

  attemptSyncRef.current = () => {
    if (!hasHydrated || !userId || !canSaveHistory(tier)) return;
    if (!gameActive || !currentGameId) return;
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncStatus("syncing");

    const run = async () => {
      try {
        if (!gameCreated) {
          const res = await fetch("/api/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: currentGameId,
              settings,
              rounds,
              winner: gameOver ? winner : null,
            }),
          });
          if (!res.ok) throw new Error("create failed");
          const data = await res.json();
          setGameCreated(true);
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
  };

  useEffect(() => {
    attemptSyncRef.current();
    // setGameCreated/setSyncStatus/setJoinCode are stable — every other
    // dependency is a real trigger, including settings (team names/rules
    // can be edited mid-game via Settings "edit" mode and need to reach
    // the saved copy).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, userId, tier, gameActive, rounds, gameOver, winner, currentGameId, gameCreated, settings]);

  // A failed sync otherwise stays failed forever unless something else
  // happens to change rounds/settings again — which won't happen once a
  // game's already over, exactly when losing the sync matters most
  // (offline right at Game Over). Mounts once; always calls whatever the
  // latest attempt is via the ref above, so this never goes stale.
  useEffect(() => {
    const onOnline = () => attemptSyncRef.current();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
