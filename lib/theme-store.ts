"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";
export type ThemeAccent = "green" | "blue" | "mono";

/** Single source of truth for preview swatches — mirrors app/globals.css exactly
 * so a UI preview can never silently drift from what the CSS actually renders. */
export const THEME_PALETTE: Record<"light" | "dark", Record<ThemeAccent, string>> = {
  dark: { green: "#173C31", blue: "#15324A", mono: "#2B2B2A" },
  light: { green: "#BFE0C7", blue: "#BFD9F0", mono: "#D9D9D4" },
};

interface ThemeState {
  mode: ThemeMode;
  accent: ThemeAccent;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: ThemeAccent) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      accent: "green",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: "birdscore-theme" }
  )
);

/** Resolves "system" against the OS preference; used both client-side and in
 * the pre-hydration inline script (kept as plain JS there — see layout.tsx). */
export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
