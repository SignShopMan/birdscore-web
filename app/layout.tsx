import type { Metadata } from "next";
import Script from "next/script";
import { ThemeInit } from "@/components/ThemeInit";
import { AuthInit } from "@/components/AuthInit";
import { PendingSaveSync } from "@/components/PendingSaveSync";
import { GameSync } from "@/components/GameSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "BirdScore — Rook Scorekeeper",
  description: "Live bid and score tracking for Rook, tableside.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var raw = localStorage.getItem('birdscore-theme');
    var state = raw ? (JSON.parse(raw).state || {}) : {};
    var mode = state.mode || 'dark';
    var accent = state.accent || 'green';
    var resolvedMode = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.setAttribute('data-mode', resolvedMode);
    document.documentElement.setAttribute('data-accent', accent);
  } catch (e) {
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.setAttribute('data-accent', 'green');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="dark" data-accent="green" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="font-body bg-felt text-parchment">
        <ThemeInit />
        <AuthInit />
        <PendingSaveSync />
        <GameSync />
        {children}
      </body>
    </html>
  );
}
