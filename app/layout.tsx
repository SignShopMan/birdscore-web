import type { Metadata } from "next";
import { Fraunces, Inter, Space_Mono } from "next/font/google";
import Script from "next/script";
import { FeedbackLink } from "@/components/FeedbackLink";
import { ThemeInit } from "@/components/ThemeInit";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "BirdScore — Rook Scorekeeper",
  description: "Live bid and score tracking for Rook, tableside.",
};

// Keep this in sync with lib/theme-store.ts's persist key/shape and resolveMode
// logic — duplicated here as plain JS since an inline pre-hydration script
// can't import from app modules. Runs before first paint so there's no flash
// of the wrong theme.
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
      <body
        className={`${fraunces.variable} ${inter.variable} ${spaceMono.variable} font-body bg-felt text-parchment`}
      >
        <ThemeInit />
        {children}
        <FeedbackLink />
      </body>
    </html>
  );
}
