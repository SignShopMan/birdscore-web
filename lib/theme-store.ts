"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";
export type ThemeAccent = "green" | "blue" | "mono";

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
