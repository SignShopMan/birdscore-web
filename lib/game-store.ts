"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SETTINGS,
  GameSettings,
  Round,
  Team,
  TrumpColor,
  calculateRoundScores,
  checkGameOver,
  newRoundId,
  nextDealerIndex,
  roundsPlayed,
  teamTotal,
} from "./rook-engine";

interface GameState {
  settings: GameSettings;
  rounds: Round[];

  // current-round-in-progress fields (mirror varTrump / varBid / varBidTeam / ...)
  // There's no separate "locked" flag — once team + bid + trump are all set, the
  // round is implicitly ready to score. UI derives that from these three fields
  // directly rather than storing a redundant boolean.
  trump: TrumpColor | null;
  bid: number | null;
  bidTeam: Team | null;
  shootMoon: boolean;
  dealerIndex: number;

  gameOver: boolean;
  winner: Team | null;

  // Which Supabase games.id (if any) this local game maps to — set once a
  // signed-in, entitled account's game gets its first sync. Null means
  // either not entitled/signed-in, or not synced yet. See GameSync.tsx for
  // the actual sync orchestration; the store just tracks the mapping.
  currentGameId: string | null;
  setCurrentGameId: (id: string | null) => void;
  // Set alongside currentGameId when a pro-tier host's game first syncs —
  // null for everyone else. Displayed as the "invite" code/link.
  joinCode: string | null;
  setJoinCode: (code: string | null) => void;
  // Live count of connected /watch viewers, via Supabase Presence — never
  // persisted, always starts at 0 and gets rebuilt from the actual
  // channel state on each connection (see RealtimeHost.tsx).
  viewerCount: number;
  setViewerCount: (n: number) => void;
  // UI-only status for "Saving…" / "Saved" feedback — set by GameSync.tsx,
  // not persisted (always starts fresh each session).
  syncStatus: "idle" | "syncing" | "synced" | "error";
  setSyncStatus: (s: GameState["syncStatus"]) => void;

  // True once the persisted state has been read back from localStorage.
  // page.tsx waits for this before deciding whether to show Settings or
  // resume a game already in progress — otherwise there'd be a flash of
  // Settings before flipping to Game the instant rehydration completes.
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // True from the moment Start Game (or New Game, or Resume) is pressed —
  // distinct from rounds.length > 0, which was the old (wrong) signal
  // GameSync used to decide whether to sync. That made "zero rounds
  // played yet" indistinguishable from "no game has ever started",
  // which meant an entitled host's join code didn't exist until their
  // first round was scored — backwards from how invites actually get used
  // (share the code first, then play).
  gameActive: boolean;

  startGame: (settings: GameSettings) => void;
  // Resets the active-game fields without touching settings or navigating
  // anywhere — used when confirming "start new, abandon this one" from the
  // menu. Deliberately doesn't set gameActive: true (that's startGame's
  // job, once the person actually confirms on NewGameScreen), so there's
  // no lingering local game a page reload could resurrect after its DB
  // record has already been marked cancelled.
  abandonGame: () => void;
  updateSettings: (settings: GameSettings) => void;
  setTrump: (t: TrumpColor) => void;
  clearTrump: () => void;
  setBidTeam: (t: Team) => void;
  setBid: (b: number) => void;
  toggleShootMoon: () => void;
  advanceDealer: () => void;
  setDealerIndex: (index: number) => void;
  saveRound: (nonBidderScore: number, rookHolderSeat?: number | null) => void;
  addAdjustment: (team: Team, points: number, label: string) => void;
  updateRound: (rowId: string, updates: Partial<Round>) => void;
  deleteRound: (rowId: string) => void;
  // Hydrates local state from a game fetched from Supabase — the Resume
  // action on AccountScreen's in-progress games list.
  loadGame: (settings: GameSettings, rounds: Round[], gameId: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      rounds: [],
      trump: null,
      bid: null,
      bidTeam: null,
      shootMoon: false,
      dealerIndex: 0,
      gameOver: false,
      winner: null,
      currentGameId: null,
      setCurrentGameId: (id) => set({ currentGameId: id }),
      joinCode: null,
      setJoinCode: (code) => set({ joinCode: code }),
      viewerCount: 0,
      setViewerCount: (n) => set({ viewerCount: n }),
      syncStatus: "idle",
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      hasHydrated: false,
      gameActive: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      startGame: (settings) =>
        set({
          settings,
          rounds: [],
          trump: null,
          bid: null,
          bidTeam: null,
          shootMoon: false,
          dealerIndex: 0,
          gameOver: false,
          winner: null,
          currentGameId: null,
          joinCode: null,
          syncStatus: "idle",
          gameActive: true,
          viewerCount: 0,
        }),

      abandonGame: () =>
        set({
          rounds: [],
          trump: null,
          bid: null,
          bidTeam: null,
          shootMoon: false,
          dealerIndex: 0,
          gameOver: false,
          winner: null,
          currentGameId: null,
          joinCode: null,
          syncStatus: "idle",
          gameActive: false,
          viewerCount: 0,
        }),

      // Adjusts rules for the game already in progress, without touching rounds already
      // scored — used when someone backs out to Settings mid-game to fix a typo.
      updateSettings: (settings) => set({ settings }),

      setTrump: (t) => set({ trump: t }),
      clearTrump: () => set({ trump: null }),
      setBidTeam: (t) => set({ bidTeam: t }),
      setBid: (b) => set({ bid: b }),

      toggleShootMoon: () =>
        set((s) => ({
          shootMoon: !s.shootMoon,
          bid: !s.shootMoon ? s.settings.maxPointsPerRound : s.bid,
        })),

      // Manual override only — normal rotation happens automatically in saveRound.
      advanceDealer: () => set((s) => ({ dealerIndex: nextDealerIndex(s.dealerIndex) })),
      setDealerIndex: (index) => set({ dealerIndex: index }),

      saveRound: (nonBidderScore, rookHolderSeat) => {
        const s = get();
        if (!s.trump || !s.bidTeam || s.bid == null) return;

        const { usScore, themScore } = calculateRoundScores({
          bidTeam: s.bidTeam,
          bid: s.bid,
          maxPointsPerRound: s.settings.maxPointsPerRound,
          nonBidderScore,
          shootMoon: s.shootMoon,
        });

        const round: Round = {
          rowId: newRoundId(),
          round: roundsPlayed(s.rounds) + 1,
          trump: s.trump,
          bidTeam: s.bidTeam,
          bid: s.bid,
          dealerIndex: s.dealerIndex,
          shootMoon: s.shootMoon,
          rookHolderSeat: rookHolderSeat ?? null,
          usScore,
          themScore,
          rowType: "Round",
          createdAt: new Date().toISOString(),
        };

        const rounds = [...s.rounds, round];
        const { over, winner } = checkGameOver(rounds, s.settings.winningScore);

        set({
          rounds,
          gameOver: over,
          winner,
          trump: null,
          bidTeam: null,
          bid: null,
          shootMoon: false,
          dealerIndex: over ? s.dealerIndex : nextDealerIndex(s.dealerIndex),
        });
      },

      // Fully optional house-rule entry — misdeal, renege, moon bonus, whatever a table
      // uses. No fixed amounts, since that varies table to table; points and reason are
      // both free-form. Reuses the Round shape (one team's score field, the other 0) so
      // totals/history/game-over detection all work without any special-casing.
      addAdjustment: (team, points, label) =>
        set((s) => {
          const entry: Round = {
            rowId: newRoundId(),
            round: roundsPlayed(s.rounds),
            usScore: team === "US" ? points : 0,
            themScore: team === "THEM" ? points : 0,
            rowType: "Adj",
            label,
            createdAt: new Date().toISOString(),
          };
          const rounds = [...s.rounds, entry];
          const { over, winner } = checkGameOver(rounds, s.settings.winningScore);
          return { rounds, gameOver: over, winner };
        }),

      updateRound: (rowId, updates) =>
        set((s) => {
          const rounds = s.rounds.map((r) =>
            r.rowId === rowId ? { ...r, ...updates } : r
          );
          const { over, winner } = checkGameOver(rounds, s.settings.winningScore);
          return { rounds, gameOver: over, winner };
        }),

      deleteRound: (rowId) =>
        set((s) => {
          const rounds = s.rounds.filter((r) => r.rowId !== rowId);
          const { over, winner } = checkGameOver(rounds, s.settings.winningScore);
          return { rounds, gameOver: over, winner };
        }),


      loadGame: (settings, rounds, gameId) =>
        set(() => {
          const { over, winner } = checkGameOver(rounds, settings.winningScore);
          return {
            settings,
            rounds,
            trump: null,
            bid: null,
            bidTeam: null,
            shootMoon: false,
            dealerIndex: 0,
            gameOver: over,
            winner,
            currentGameId: gameId,
            syncStatus: "synced",
            gameActive: true,
          };
        }),
    }),
    {
      name: "birdscore-game",
      // Only the actual game data — never the action functions, and
      // hasHydrated tracks itself via onRehydrateStorage below rather than
      // being persisted (it should always start false on a fresh load).
      partialize: (state) => ({
        settings: state.settings,
        rounds: state.rounds,
        trump: state.trump,
        bid: state.bid,
        bidTeam: state.bidTeam,
        shootMoon: state.shootMoon,
        dealerIndex: state.dealerIndex,
        gameOver: state.gameOver,
        winner: state.winner,
        currentGameId: state.currentGameId,
        joinCode: state.joinCode,
        gameActive: state.gameActive,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function usTotal(rounds: Round[]) {
  return teamTotal(rounds, "US");
}
export function themTotal(rounds: Round[]) {
  return teamTotal(rounds, "THEM");
}
