export const metadata = {
  title: "Terms of Service — BirdScore",
};

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-12 lg:py-16">
      <a href="/" className="font-body text-xs uppercase tracking-[0.3em] text-brass underline underline-offset-4">
        &larr; Back to BirdScore
      </a>
      <h1 className="mt-4 font-display text-3xl font-semibold text-parchment">Terms of Service</h1>
      <p className="mt-2 font-body text-xs text-parchment/60">Last updated July 2026</p>

      <div className="mt-8 space-y-6 font-body text-sm leading-relaxed text-parchment/85">
        <p>BirdScore is currently in beta. By using it, you agree to the following.</p>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">The service</h2>
          <p className="mt-1">
            BirdScore is a scorekeeping tool for the card game Rook. The free tier is available
            without an account. Paid tiers ($3.99 one time, $19.99/year) add saved history, named
            players, and realtime hosting, as described in the app.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Beta status</h2>
          <p className="mt-1">
            &ldquo;Beta&rdquo; here means the feature set is still growing — new features and
            refinements ship regularly. It doesn&rsquo;t mean what&rsquo;s already built is
            unreliable: core scoring, saved history, and realtime hosting are stable and won&rsquo;t
            disappear. We take real care with saved data, but as with any young product we
            recommend not relying on BirdScore as the sole record of anything you can&rsquo;t
            afford to lose.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Payments and refunds</h2>
          <p className="mt-1">
            Payments are processed by Stripe. The $3.99 tier is a one-time purchase; the $19.99
            tier renews annually unless cancelled. If something goes wrong with a purchase,
            contact us at the email below and we&rsquo;ll sort it out directly.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Acceptable use</h2>
          <p className="mt-1">
            Don&rsquo;t use BirdScore to abuse, harass, or attempt to disrupt the service for
            other users, or to attempt unauthorized access to accounts or data that aren&rsquo;t
            yours.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Limitation of liability</h2>
          <p className="mt-1">
            BirdScore is provided as-is, without warranty of any kind. We&rsquo;re not liable for
            disputes over game outcomes, lost data, or any damages arising from use of the app,
            to the maximum extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-parchment">Contact</h2>
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
