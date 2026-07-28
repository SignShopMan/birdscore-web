"use client";

import { create } from "zustand";
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

  startGame: (settings: GameSettings) => void;
  updateSettings: (settings: GameSettings) => void;
  setTrump: (t: TrumpColor) => void;
  clearTrump: () => void;
  setBidTeam: (t: Team) => void;
  setBid: (b: number) => void;
  toggleShootMoon: () => void;
  advanceDealer: () => void;
  saveRound: (nonBidderScore: number) => void;
  addAdjustment: (team: Team, points: number, label: string) => void;
  updateRound: (rowId: string, usScore: number, themScore: number) => void;
  deleteRound: (rowId: string) => void;
  newGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  rounds: [],
  trump: null,
  bid: null,
  bidTeam: null,
  shootMoon: false,
  dealerIndex: 0,
  gameOver: false,
  winner: null,

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

  saveRound: (nonBidderScore) => {
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

  updateRound: (rowId, usScore, themScore) =>
    set((s) => {
      const rounds = s.rounds.map((r) =>
        r.rowId === rowId ? { ...r, usScore, themScore } : r
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

  newGame: () =>
    set({
      rounds: [],
      gameOver: false,
      winner: null,
      trump: null,
      bidTeam: null,
      bid: null,
      shootMoon: false,
      dealerIndex: 0,
    }),
}));

export function usTotal(rounds: Round[]) {
  return teamTotal(rounds, "US");
}
export function themTotal(rounds: Round[]) {
  return teamTotal(rounds, "THEM");
}
