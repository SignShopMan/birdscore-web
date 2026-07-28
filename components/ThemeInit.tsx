"use client";

import { useEffect } from "react";
import { useThemeStore, resolveMode } from "@/lib/theme-store";

/** Keeps <html data-mode data-accent> in sync with the theme store after
 * hydration, including live updates if the OS theme changes while "system"
 * mode is selected. The pre-hydration inline script in layout.tsx handles
 * the very first paint so there's no flash of the wrong theme. */
export function ThemeInit() {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);

  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute("data-mode", resolveMode(mode));
      document.documentElement.setAttribute("data-accent", accent);
    };
    apply();

    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [mode, accent]);

  return null;
}
