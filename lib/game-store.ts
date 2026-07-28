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
  teamTotal,
} from "./rook-engine";

interface GameState {
  settings: GameSettings;
  rounds: Round[];

  // current-round-in-progress fields (mirror varTrump / varBid / varBidTeam / ...)
  trump: TrumpColor | null;
  bid: number | null;
  bidTeam: Team | null;
  bidLocked: boolean;
  shootMoon: boolean;
  dealerIndex: number;
  dealerIsSet: boolean;

  gameOver: boolean;
  winner: Team | null;

  startGame: (settings: GameSettings) => void;
  setTrump: (t: TrumpColor) => void;
  setBidTeam: (t: Team) => void;
  setBid: (b: number) => void;
  toggleShootMoon: () => void;
  lockBid: () => void;
  unlockBid: () => void;
  advanceDealer: () => void;
  saveRound: (nonBidderScore: number) => void;
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
  bidLocked: false,
  shootMoon: false,
  dealerIndex: 0,
  dealerIsSet: false,
  gameOver: false,
  winner: null,

  startGame: (settings) =>
    set({
      settings,
      rounds: [],
      trump: null,
      bid: null,
      bidTeam: null,
      bidLocked: false,
      shootMoon: false,
      dealerIndex: 0,
      dealerIsSet: false,
      gameOver: false,
      winner: null,
    }),

  setTrump: (t) => set({ trump: t }),
  setBidTeam: (t) => set({ bidTeam: t }),
  setBid: (b) => set({ bid: b }),

  toggleShootMoon: () =>
    set((s) => ({
      shootMoon: !s.shootMoon,
      bid: !s.shootMoon ? s.settings.maxPointsPerRound : s.bid,
    })),

  lockBid: () => set({ bidLocked: true }),
  unlockBid: () => set({ bidLocked: false, trump: null }),

  advanceDealer: () =>
    set((s) => ({
      dealerIndex: nextDealerIndex(s.dealerIndex),
      dealerIsSet: true,
    })),

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
      round: s.rounds.length + 1,
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
      bidLocked: false,
      trump: null,
      bidTeam: null,
      bid: null,
      shootMoon: false,
      dealerIndex: over
        ? s.dealerIndex
        : s.dealerIsSet
        ? nextDealerIndex(s.dealerIndex)
        : s.dealerIndex,
    });
  },

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
      bidLocked: false,
      trump: null,
      bidTeam: null,
      bid: null,
      shootMoon: false,
      dealerIndex: 0,
      dealerIsSet: false,
    }),
}));

export function usTotal(rounds: Round[]) {
  return teamTotal(rounds, "US");
}
export function themTotal(rounds: Round[]) {
  return teamTotal(rounds, "THEM");
}
