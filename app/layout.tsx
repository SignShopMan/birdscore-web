import type { Metadata } from "next";
import { Fraunces, Inter, Space_Mono } from "next/font/google";
import { FeedbackLink } from "@/components/FeedbackLink";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${spaceMono.variable} font-body bg-felt text-parchment`}
      >
        {children}
        <FeedbackLink />
      </body>
    </html>
  );
}
