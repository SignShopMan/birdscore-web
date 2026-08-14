"use client";

import { MainMenu } from "./MainMenu";

const EXTERNAL_LINKS: { title: string; url: string; note: string }[] = [
  {
    title: "Official Rook Rules (rookgame.com)",
    url: "https://rookgame.com/official-rules/",
    note: "Clear, modern write-up, including the Kentucky West-style variant most commonly played today. Links to Hasbro's own printable PDF too.",
  },
  {
    title: "Kentucky Discard — Tournament Rules",
    url: "https://s3.amazonaws.com/file.imleagues/Images/Schools/Uploaded/201503/201531892727.pdf",
    note: "The stricter, competition version — useful if your table wants formal, unambiguous rulings on edge cases.",
  },
  {
    title: "Hasbro's Official Instructions",
    url: "https://instructions.hasbro.com/en-us/instruction/rook-card-game",
    note: "The current retail box rules, including the simplified Beginner variant.",
  },
];

export function ResourcesScreen({
  onNewGame,
  onOpenSettings,
  onOpenAccount,
  onOpenHistory,
  onOpenFaq,
  onOpenResources,
  onBack,
}: {
  onNewGame: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenFaq: () => void;
  onOpenResources: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 lg:max-w-lg lg:py-14">
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="font-body text-xs uppercase tracking-[0.3em] text-brass-text underline underline-offset-4"
        >
          &larr; Back
        </button>
        <MainMenu
          onNewGame={onNewGame}
          onOpenSettings={onOpenSettings}
          onOpenAccount={onOpenAccount}
          onOpenHistory={onOpenHistory}
          onOpenFaq={onOpenFaq}
          onOpenResources={onOpenResources}
        />
      </header>
      <h1 className="mt-1 font-display text-4xl font-semibold text-parchment">Resources</h1>
      <p className="mt-2 font-body text-base leading-relaxed text-parchment/75">
        Rook&reg; is a fast trick-taking card game for four players in two partnerships &mdash;
        the same bidding-and-trump tension as bridge or spades, but with a deck built just for
        it: four colors instead of suits, no face cards to learn, and one wild card (the Rook
        itself) that beats everything. A hand wraps up in 15&ndash;20 minutes, it&rsquo;s easy to
        pick up in a single game, and it&rsquo;s been a favorite around family tables for over a
        century.
      </p>
      <p className="mt-3 font-body text-base leading-relaxed text-parchment/75">
        Rules vary table to table &mdash; different win targets, different penalty amounts,
        sometimes different deck sizes. What&rsquo;s below is the common ground across most
        published rule sets. Where your table plays it differently, use custom winning scores
        and hand sizes in Settings, and the Penalty/Bonus button on the Scoreboard for anything
        below that isn&rsquo;t built in directly.
      </p>

      <div className="mt-8 space-y-6 font-body text-base leading-relaxed text-parchment/85">
        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">The Basics</h2>
          <div className="mt-2 space-y-3">
            <p>
              <span className="font-semibold text-parchment">Setup.</span> Four players, two
              partnerships, partners sitting across from each other. The deck: four colors
              (Black, Green, Red, Yellow) numbered 5&ndash;14, plus the Rook card, for 41 cards in
              play. Each player gets 9 cards; the remaining 5 form a face-down &ldquo;nest&rdquo;
              in the middle.
            </p>
            <p>
              <span className="font-semibold text-parchment">Bidding.</span> Starting to the
              dealer&rsquo;s left, players bid in increments of 5 for the right to name trump.
              Whoever bids highest picks up the nest, adding it to their hand, then discards
              back down to 9 cards before naming trump.
            </p>
            <p>
              <span className="font-semibold text-parchment">Playing.</span> The bidder&rsquo;s
              team leads first. Follow the color led if you can; if you can&rsquo;t, play trump
              or discard anything. The highest card of the color led wins the trick, unless
              someone trumped it, in which case the highest trump wins &mdash; and the Rook card
              beats every other trump. Whoever wins a trick leads the next one.
            </p>
            <p>
              <span className="font-semibold text-parchment">Scoring.</span> Only certain cards
              carry points (&ldquo;counters&rdquo;): each 5 is worth 5, each 10 and each 14 is
              worth 10, and the Rook card is worth 20 &mdash; 120 points total in play. The team
              that didn&rsquo;t bid always scores whatever counters they actually captured,
              win or lose. The bidding team scores everything they captured <em>if</em> it meets
              or beats their bid; if it doesn&rsquo;t, they lose points equal to their bid
              instead and score nothing for the hand. This is exactly how BirdScore itself
              calculates every round.
            </p>
            <p>
              <span className="font-semibold text-parchment">Winning.</span> Most tables play to
              300, though 500 shows up plenty too &mdash; set whatever your table agrees on in
              Settings. If both teams cross the target in the same hand, the more common rule is
              simply whoever has more wins; some tables play another hand instead. BirdScore
              defaults to the first (compare and declare the higher total), since exact ties at
              that exact moment are rare enough in practice that it&rsquo;s not worth stopping
              the game over.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">
            Common Penalties (These Vary &mdash; Yours Might Differ)
          </h2>
          <p className="mt-1 text-parchment/70">
            None of these are universal. They&rsquo;re the versions that show up most often
            across published rule sets, offered as a reasonable default if your table
            hasn&rsquo;t settled on its own.
          </p>
          <div className="mt-2 space-y-3">
            <p>
              <span className="font-semibold text-parchment">Renege</span> (failing to follow
              the color led when you could have): if caught before the next trick is played, it
              can usually just be corrected. If it&rsquo;s not caught until later, the most
              common rule is that the offending team loses points equal to that hand&rsquo;s bid
              &mdash; regardless of which team actually held the bid &mdash; and the other team
              keeps whatever counters they&rsquo;d already captured.
            </p>
            <p>
              <span className="font-semibold text-parchment">Misdeal</span>: caught before any
              tricks are played, it&rsquo;s usually just a free re-deal, no penalty, deal passes
              left. Caught later in the hand, the dealer&rsquo;s team commonly loses 40 points
              and the other team doesn&rsquo;t score that hand at all.
            </p>
            <p>
              <span className="font-semibold text-parchment">Improper nest discard</span>{" "}
              (exchanging the wrong number of cards, or looking at/revealing the nest
              incorrectly): a flat 40-point penalty is the figure that shows up most
              consistently across different tournament rule sets.
            </p>
            <p className="text-parchment/70">
              Whatever your table actually does, the Penalty/Bonus button on the Scoreboard
              applies any of these on the spot &mdash; there&rsquo;s no need for BirdScore to
              hard-code one specific number.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Learn More</h2>
          <div className="mt-2 space-y-3">
            {EXTERNAL_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-card bg-paper p-3 shadow-card"
              >
                <p className="font-body text-sm font-semibold text-ink">{link.title}</p>
                <p className="mt-0.5 font-body text-sm text-ink/70">{link.note}</p>
              </a>
            ))}
          </div>
        </section>

        <p className="font-body text-xs text-parchment/50">
          Rook&reg; is a registered trademark of Hasbro, Inc. BirdScore is an independent
          scorekeeping companion and isn&rsquo;t affiliated with, sponsored by, or endorsed by
          Hasbro.
        </p>
      </div>
    </div>
  );
}
