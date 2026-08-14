"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";
export type ThemeAccent = "green" | "blue" | "mono";

// A root-font-size percentage, not a Tailwind class swap — Tailwind's default
// scale (text-*, and most spacing/gap/padding utilities) is rem-based, so
// scaling the <html> element's font-size scales all of it proportionally,
// app-wide, the same mechanism browser/OS zoom uses. That's deliberate: a
// tester found FAQ/Resources body text too small, but a one-off size bump on
// two screens only helps two screens — this is the real, durable fix (WCAG
// 1.4.4 Resize Text), and it's the same lever for every screen at once.
export const TEXT_SCALE_MIN = 80;
export const TEXT_SCALE_MAX = 150;
export const TEXT_SCALE_STEP = 10;
export const TEXT_SCALE_DEFAULT = 100;

/** Single source of truth for preview swatches — mirrors app/globals.css exactly
 * so a UI preview can never silently drift from what the CSS actually renders. */
export const THEME_PALETTE: Record<"light" | "dark", Record<ThemeAccent, string>> = {
  dark: { green: "#173C31", blue: "#15324A", mono: "#2B2B2A" },
  light: { green: "#BFE0C7", blue: "#BFD9F0", mono: "#D9D9D4" },
};

interface ThemeState {
  mode: ThemeMode;
  accent: ThemeAccent;
  textScale: number;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: ThemeAccent) => void;
  setTextScale: (n: number) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "dark",
      accent: "green",
      textScale: TEXT_SCALE_DEFAULT,
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setTextScale: (textScale) =>
        set({ textScale: Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, textScale)) }),
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
