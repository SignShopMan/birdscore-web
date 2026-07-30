"use client";

import { MainMenu } from "./MainMenu";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's free, and what costs money?",
    a: "The full game — bidding, trump, scoring, adjustments — is free forever, no account needed. $3.99 (one-time) adds saved game history and named players. $19.99/year adds realtime hosting (invite others to watch your game live) and deeper stats like who held the Rook and who dealt.",
  },
  {
    q: "How do I actually watch a game someone invited me to?",
    a: "Tap their invite link, or go to the menu \u2192 Watch a Game and type in the 6-character code they gave you. Either way, no account, no download \u2014 just the code.",
  },
  {
    q: "If I host a realtime game, do the people I invite need to pay too?",
    a: "No — only the host needs the $19.99/year tier. Anyone you invite can join and watch live for free, no account required.",
  },
  {
    q: "Can two people both score the same game at once?",
    a: "No, by design — one scorekeeper per game, same as a physical scorepad. Everyone else invited to a realtime game sees a live, read-only view.",
  },
  {
    q: "What happens if my $19.99/year subscription lapses?",
    a: "You keep everything the $3.99 tier includes — saved history, named players — permanently. You only lose realtime hosting and the enhanced stats until you renew.",
  },
  {
    q: "Do I need to buy the $3.99 tier before the $19.99/year one?",
    a: "No — $19.99/year includes everything on its own.",
  },
  {
    q: "I finished a free game without an account — is it gone?",
    a: "Not immediately. It stays in your browser until you start a new game. The prompt at the end of a finished game lets you save it permanently if you sign up at that point.",
  },
];

export function FaqScreen({
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onBack,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4"
        >
          &larr; Back
        </button>
        <MainMenu onNewGame={onNewGame} onOpenSettings={onOpenSettings} onOpenAccount={onOpenAccount} onOpenHistory={onOpenHistory} onOpenFaq={onOpenFaq} />
      </header>
      <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">Questions</h1>

      <div className="mt-8 space-y-3">
        {FAQS.map(({ q, a }) => (
          <div key={q} className="rounded-card bg-paper p-4 shadow-card">
            <p className="font-body text-sm font-semibold text-ink">{q}</p>
            <p className="mt-1 font-body text-xs text-ink/70">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
