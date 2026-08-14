export const metadata = {
  title: "Privacy Policy — BirdScore",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-12 lg:py-16">
      <a href="/" className="font-body text-xs uppercase tracking-[0.3em] text-brass-text underline underline-offset-4">
        &larr; Back to BirdScore
      </a>
      <h1 className="mt-4 font-display text-3xl font-semibold text-parchment">Privacy Policy</h1>
      <p className="mt-2 font-body text-xs text-parchment/60">Last updated July 2026</p>

      <div className="mt-8 space-y-6 font-body text-sm leading-relaxed text-parchment/85">
        <p>
          BirdScore is a Rook scorekeeping app. Here&rsquo;s what data it collects and what
          happens to it.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">
            You can use the core app without an account
          </h2>
          <p className="mt-1">
            Scoring a game — bidding, trump, rounds, adjustments — works entirely in your own
            browser with no account and nothing sent to us. That data lives only on your device
            until you close it or clear your browser storage.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">
            What we collect if you create an account
          </h2>
          <p className="mt-1">
            An account is only needed for saved game history, named players, or hosting a
            realtime game. Creating one requires an email address, used solely to send you a
            sign-in link and to identify your account. We don&rsquo;t sell it, and we don&rsquo;t
            use it for marketing you haven&rsquo;t asked for.
          </p>
          <p className="mt-1">
            Once signed in, games you choose to save are stored on our servers (via Supabase) —
            team names, round-by-round scores, and, if you use named players, the names you enter
            for the people you play with.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Payments</h2>
          <p className="mt-1">
            Paid tiers are processed by Stripe. We never see or store your card details — Stripe
            handles that directly, and BirdScore only ever receives confirmation that a payment
            succeeded.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Watching a game live</h2>
          <p className="mt-1">
            Watching a hosted game via an invite code requires no account and nothing is stored
            about you — the connection is temporary, purely to relay the host&rsquo;s live scores
            to your screen while you&rsquo;re watching.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Who we share data with</h2>
          <p className="mt-1">
            The services that make BirdScore work: Supabase (accounts and saved game data),
            Stripe (payments), Resend (sending sign-in emails), and Vercel (hosting). We don&rsquo;t
            sell your data to anyone else or use third-party advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Your choices</h2>
          <p className="mt-1">
            You can delete individual saved games yourself from the History page. To delete your
            account and all associated data entirely, contact us using the email below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Questions</h2>
          <p className="mt-1">
            <a
              href="mailto:feedback@therealbirdscore.com"
              className="underline underline-offset-4"
            >
              feedback@therealbirdscore.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
