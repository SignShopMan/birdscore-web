import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeInit } from "@/components/ThemeInit";
import { AuthInit } from "@/components/AuthInit";
import { PendingSaveSync } from "@/components/PendingSaveSync";
import { GameSync } from "@/components/GameSync";
import { RealtimeHost } from "@/components/RealtimeHost";
import { UpdateChecker } from "@/components/UpdateChecker";
import { CapacitorInit } from "@/components/CapacitorInit";
import { OfflineBanner } from "@/components/OfflineBanner";
import { CheckoutResultBanner } from "@/components/CheckoutResultBanner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://therealbirdscore.com"),
  alternates: {
    canonical: "/",
  },
  title: "BirdScore — Rook Scorekeeper",
  description: "Live bid and score tracking for Rook, tableside.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BirdScore",
  },
  openGraph: {
    title: "BirdScore — Rook Scorekeeper",
    description: "Live bid and score tracking for Rook, tableside.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BirdScore — Rook Scorekeeper",
    description: "Live bid and score tracking for Rook, tableside.",
  },
};

export const viewport: Viewport = {
  themeColor: "#173C31",
  // Required for env(safe-area-inset-*) to report real values instead of
  // 0 everywhere — without it, the fixed-position full-screen overlays
  // (mobile Scoreboard sheet) have no way to know how tall the notch/
  // Dynamic Island/status bar actually is on a given device, so a fixed
  // pt-* either overshoots on phones without one or undershoots on ones
  // with a bigger inset than assumed.
  viewportFit: "cover",
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
        <OfflineBanner />
        <ThemeInit />
        <AuthInit />
        <PendingSaveSync />
        <GameSync />
        <RealtimeHost />
        <UpdateChecker />
        <CheckoutResultBanner />
        <CapacitorInit />
        {children}
      </body>
    </html>
  );
}
